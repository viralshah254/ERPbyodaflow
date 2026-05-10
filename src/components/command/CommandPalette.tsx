"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, usePathname } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";
import { useCopilotStore } from "@/stores/copilot-store";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { getTutorialForRoute } from "@/config/tutorial";
import {
  COMMAND_NAV_FALLBACK_ITEMS,
  COMMAND_CREATE_ITEMS,
  COMMAND_COPILOT_ITEMS,
  getCreateDocHref,
  type CommandItem,
  type CommandItemNav,
} from "@/config/command-palette";
import {
  computeDashboardSidebarSections,
  computeDashboardSidebarModules,
} from "@/lib/nav/compute-dashboard-sidebar-sections";
import {
  applySidebarLayout,
  splitSectionsMainAndMore,
} from "@/config/navigation/sidebar-layout";
import {
  flattenNavSectionsToCommandItems,
  getRecentRoutes,
  recordRecentRoute,
  scoreNavItem,
  type RecentRoute,
} from "@/lib/nav/command-palette-nav";
import { fetchPreferencesApi } from "@/lib/api/preferences";
import { isApiConfigured } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { searchErpApi, type ErpSearchHit } from "@/lib/api/erp-search";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import * as Icons from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AskAiItem {
  id: string;
  group: "ask";
  label: string;
  prompt: string;
  intentPreview: string;
}

interface SearchResultItem {
  id: string;
  group: "search";
  label: string;
  href: string;
  subtitle?: string;
  entityType: ErpSearchHit["entityType"];
}

type DisplayItem = (CommandItem & { _breadcrumb?: string; _section?: string }) | AskAiItem | SearchResultItem;

type SearchState = "idle" | "loading" | "ok" | "error" | "unavailable";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  ask: "Ask AI",
  search: "ERP records",
  nav: "Navigate",
  create: "Create",
  copilot: "Copilot",
  recent: "Recent",
};

function getIntentPreview(query: string): string {
  const q = query.trim().toLowerCase();
  if (q.includes("stock") || q.includes("inventory") || q.includes("sku")) return "Query inventory · Run forecast · Filter by criteria";
  if (q.includes("approv") || q.includes("pending")) return "Open approvals · Filter pending items";
  if (q.includes("cash") || q.includes("margin") || q.includes("forecast")) return "Finance intelligence · Cash or margin view";
  if (q.includes("order") || q.includes("po") || q.includes("purchase")) return "Purchasing · Orders or requests";
  if (q.includes("production") || q.includes("schedule") || q.includes("work order")) return "Production · Schedules or work orders";
  return "Interpret as ERP query · Execute or show results";
}

/** Simple icon-from-entityType mapping for ERP search results. */
function entityIcon(type: string): string {
  const map: Record<string, string> = {
    customer: "Users",
    supplier: "Building2",
    product: "Package",
    document: "FileText",
    payment: "CreditCard",
    warehouse: "Warehouse",
    stock: "Boxes",
    approval: "CheckCircle2",
    "bank-account": "Wallet",
  };
  return map[type] ?? "Search";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const copilotEnabled = useCopilotFeatureEnabled();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const openDrawer = useCopilotStore((s) => s.openDrawer);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const setContext = useCopilotStore((s) => s.setContext);

  // Auth + org context (mirrors AppSidebar)
  const { user, org, permissions } = useAuthStore();
  const {
    orgType: ctxOrgType,
    enabledModules,
    featureFlags,
    template,
    orgRole,
    franchisePersona,
  } = useOrgContextStore();

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(0);
  const [searchResults, setSearchResults] = React.useState<SearchResultItem[]>([]);
  const [searchState, setSearchState] = React.useState<SearchState>("idle");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [recents, setRecents] = React.useState<RecentRoute[]>([]);
  const [sidebarLayout, setSidebarLayout] = React.useState<import("@/config/navigation/sidebar-layout").SidebarLayout | null | undefined>(undefined);

  // Load sidebar layout prefs (same logic as AppSidebar)
  const sidebarPreferencesRevision = useUIStore((s) => s.sidebarPreferencesRevision);
  React.useEffect(() => {
    if (!isApiConfigured()) { setSidebarLayout(null); return; }
    let cancelled = false;
    fetchPreferencesApi()
      .then((p) => { if (!cancelled) setSidebarLayout(p.sidebarLayout ?? null); })
      .catch(() => { if (!cancelled) setSidebarLayout(null); });
    return () => { cancelled = true; };
  }, [sidebarPreferencesRevision]);

  // Build resolved nav sections (same as AppSidebar)
  const navParams = React.useMemo(() => ({
    ctxOrgType,
    orgOrgType: org?.orgType,
    enabledModules,
    featureFlags: featureFlags ?? {},
    template,
    user,
    permissions,
    orgRole,
    franchisePersona,
  }), [ctxOrgType, org?.orgType, enabledModules, featureFlags, template, user, permissions, orgRole, franchisePersona]);

  const visibleSections = React.useMemo(() => {
    const base = computeDashboardSidebarSections(navParams);
    const modules = computeDashboardSidebarModules(navParams);
    const pins = {
      dashboardEnabled: modules.includes("dashboard"),
      manufacturingEnabled: modules.includes("manufacturing"),
    };
    const layout = sidebarLayout === undefined ? undefined : sidebarLayout ?? undefined;
    const applied = applySidebarLayout(base, layout, pins);
    const { main, more } = splitSectionsMainAndMore(applied, layout ?? null);
    return [...main, ...more];
  }, [navParams, sidebarLayout]);

  // Flatten sidebar to nav items for the palette (memoized, won't change unless sidebar changes)
  const navItems = React.useMemo(
    () => flattenNavSectionsToCommandItems(visibleSections, COMMAND_NAV_FALLBACK_ITEMS),
    [visibleSections]
  );

  // All non-nav items
  const staticItems = React.useMemo<CommandItem[]>(
    () => [
      ...COMMAND_CREATE_ITEMS,
      ...(copilotEnabled ? COMMAND_COPILOT_ITEMS : []),
    ],
    [copilotEnabled]
  );

  // Load recents when palette opens
  React.useEffect(() => {
    if (open) {
      setRecents(getRecentRoutes());
      setQuery("");
      setSelected(0);
      setSearchResults([]);
      setSuggestions([]);
      setSearchState("idle");
    }
  }, [open]);

  // Debounced ERP search
  React.useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setSearchResults([]);
      setSuggestions([]);
      setSearchState("idle");
      return;
    }
    setSearchState("loading");
    const timer = window.setTimeout(() => {
      searchErpApi(query)
        .then((response) => {
          if (!active) return;
          setSearchResults(
            response.hits.slice(0, 10).map((hit) => ({
              id: `search-${hit.entityType}-${hit.id}`,
              group: "search" as const,
              label: hit.title,
              href: hit.href,
              subtitle: hit.subtitle,
              entityType: hit.entityType,
            }))
          );
          setSuggestions(response.suggestions?.slice(0, 4) ?? []);
          setSearchState("ok");
        })
        .catch((err) => {
          if (!active) return;
          // 403 = permission-gated, surface a softer message
          const status = (err as { status?: number }).status;
          setSearchState(status === 403 ? "unavailable" : "error");
          setSearchResults([]);
          setSuggestions([]);
        });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  // Ranked nav filtering for non-empty query
  const filteredNav = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const scored = navItems
      .map((item) => ({ item, score: scoreNavItem(item, tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
    return scored.map((x) => x.item);
  }, [query, navItems]);

  // Filter non-nav static items
  const filteredStatic = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticItems;
    const tokens = q.split(/\s+/).filter(Boolean);
    return staticItems.filter((item) => {
      const label = item.label.toLowerCase();
      const keywords = (item.keywords ?? []).join(" ").toLowerCase();
      const searchable = `${label} ${keywords}`;
      return tokens.every((t) => searchable.includes(t));
    });
  }, [query, staticItems]);

  // Build display list
  const displayList = React.useMemo((): DisplayItem[] => {
    const q = query.trim();

    // ── Empty state: show recents ──
    if (!q) {
      const recentItems: DisplayItem[] = recents.map((r) => ({
        id: `recent-${r.href}`,
        group: "recent" as unknown as "nav",
        label: r.label,
        href: r.href,
        icon: r.icon ?? "Clock",
        keywords: [],
        _breadcrumb: undefined,
        _section: "Recent",
      }));
      // Add up to 3 quick-start defaults if no recents
      if (recentItems.length === 0) {
        const starters = ["/dashboard", "/docs", "/settings"].flatMap((href) => {
          const found = navItems.find((n) => n.href === href);
          return found ? [{ ...found, id: `starter-${href}`, _section: "Quick start" } as DisplayItem] : [];
        });
        return [...starters, ...filteredStatic.slice(0, 8)];
      }
      return [...recentItems, ...filteredStatic.slice(0, 5)];
    }

    // ── Query state ──
    const askAiItem: AskAiItem | null = copilotEnabled
      ? {
          id: "ask-ai",
          group: "ask",
          label: `Ask AI: "${q}"`,
          prompt: q,
          intentPreview: getIntentPreview(q),
        }
      : null;

    const out: DisplayItem[] = [];
    if (askAiItem) out.push(askAiItem);

    // ERP search results first when available
    if (searchResults.length > 0) {
      out.push(...(searchResults as DisplayItem[]));
    }

    // Ranked nav items
    out.push(...(filteredNav as unknown as DisplayItem[]));

    // Create / Copilot items
    out.push(...(filteredStatic as DisplayItem[]));

    return out;
  }, [query, recents, navItems, searchResults, filteredNav, filteredStatic, copilotEnabled]);

  // Keyboard shortcut
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  React.useEffect(() => { setSelected(0); }, [query]);

  React.useEffect(() => {
    if (selected >= displayList.length) setSelected(Math.max(0, displayList.length - 1));
  }, [displayList.length, selected]);

  const navigate = React.useCallback(
    (href: string, label: string, icon?: string) => {
      recordRecentRoute({ href, label, icon });
      setOpen(false);
      router.push(href);
    },
    [router, setOpen]
  );

  const handleSelect = React.useCallback(
    (item: DisplayItem) => {
      // Ask AI
      if (item.group === "ask" && "prompt" in item) {
        setOpen(false);
        openDrawerWithPrompt((item as AskAiItem).prompt);
        return;
      }
      // ERP search result
      if (item.group === "search" && "href" in item) {
        navigate(item.href, item.label, entityIcon((item as SearchResultItem).entityType));
        return;
      }
      // Nav
      if ("href" in item && item.href) {
        navigate(item.href, item.label, (item as CommandItemNav).icon);
        return;
      }
      // Create doc
      if (item.group === "create" && "docType" in item) {
        setOpen(false);
        router.push(getCreateDocHref((item as import("@/config/command-palette").CommandItemCreate).docType));
        return;
      }
      // Copilot
      if (item.group === "copilot" && "copilotPrompt" in item) {
        setOpen(false);
        const cp = item as import("@/config/command-palette").CommandItemCopilot;
        if (cp.id === "copilot-ask" && pathname) {
          const tutorial = getTutorialForRoute(pathname);
          if (tutorial) {
            setContext({ page: tutorial.itemLabel ?? tutorial.chapterTitle, route: pathname });
            openDrawerWithPrompt(tutorial.copilotPrompt);
          } else {
            setContext({ route: pathname });
            openDrawerWithPrompt("Explain this page and suggest next steps.");
          }
        } else if (cp.copilotPrompt?.trim()) {
          openDrawerWithPrompt(cp.copilotPrompt);
        } else {
          openDrawer();
        }
      }
    },
    [navigate, router, pathname, setOpen, openDrawer, openDrawerWithPrompt, setContext]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = displayList;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => (s + 1) % Math.max(1, list.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => (s - 1 + list.length) % Math.max(1, list.length)); }
    else if (e.key === "Enter" && list.length > 0 && list[selected]) { e.preventDefault(); handleSelect(list[selected]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const isEmptyQuery = !query.trim();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-xl border bg-card shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            {searchState === "loading"
              ? <Icons.Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              : <Icons.Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
            <Input
              placeholder={
                copilotEnabled
                  ? "Search pages, records, create docs, ask AI…"
                  : "Search pages or records…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 bg-transparent p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex h-6 shrink-0 items-center rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Suggestion chips (from ERP search API) */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b px-4 py-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <ScrollArea className="h-[min(65vh,440px)]">
            <div className="p-2">
              {/* Empty query hint */}
              {isEmptyQuery && recents.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Continue typing to search everywhere.
                </p>
              )}

              {/* Search status rows */}
              {!isEmptyQuery && searchState === "loading" && (
                <div className="px-3 py-2 text-xs text-muted-foreground animate-pulse">
                  Searching ERP records…
                </div>
              )}
              {!isEmptyQuery && searchState === "error" && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Record search failed. Showing page results only.
                </div>
              )}
              {!isEmptyQuery && searchState === "unavailable" && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Record search unavailable for your role. Showing pages only.
                </div>
              )}

              {/* Main list */}
              {displayList.length === 0 && !isEmptyQuery && searchState !== "loading" ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                (() => {
                  let prevGroup = "";
                  return displayList.map((item, i) => {
                    const rawGroup = item.group as string;
                    const displayGroup = rawGroup === "recent" ? "recent" : rawGroup;
                    const showHeader = prevGroup !== displayGroup;
                    if (showHeader) prevGroup = displayGroup;
                    const isSelected = i === selected;
                    const isAskAi = item.group === "ask";

                    const iconKey = isAskAi
                      ? "Sparkles"
                      : displayGroup === "recent"
                        ? "Clock"
                        : displayGroup === "search"
                          ? entityIcon((item as SearchResultItem).entityType)
                          : "icon" in item
                            ? ((item as CommandItemNav).icon ?? "Circle")
                            : "Circle";

                    const Icon = (Icons[iconKey as keyof typeof Icons] || Icons.Circle) as React.ComponentType<{ className?: string }>;

                    const sectionLabel =
                      "_section" in item && (item as { _section?: string })._section
                        ? (item as { _section?: string })._section
                        : GROUP_LABELS[displayGroup] ?? displayGroup;

                    const breadcrumb =
                      "_breadcrumb" in item ? (item as { _breadcrumb?: string })._breadcrumb : undefined;

                    return (
                      <React.Fragment key={item.id}>
                        {showHeader && (
                          <div className="sticky top-0 z-10 flex items-center gap-2 bg-card/95 px-3 py-1.5 backdrop-blur">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              {sectionLabel}
                            </span>
                            <div className="h-px flex-1 bg-border/50" />
                          </div>
                        )}
                        <button
                          type="button"
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          )}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelected(i)}
                        >
                          <div className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                            isAskAi ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
                          )}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-medium leading-snug">{item.label}</span>
                            {/* Subtitle / breadcrumb line */}
                            {isAskAi && "intentPreview" in item ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {(item as AskAiItem).intentPreview}
                              </span>
                            ) : displayGroup === "search" && "subtitle" in item && (item as SearchResultItem).subtitle ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {(item as SearchResultItem).subtitle}
                              </span>
                            ) : breadcrumb ? (
                              <span className="block truncate text-xs text-muted-foreground/70">
                                {breadcrumb}
                              </span>
                            ) : null}
                          </div>
                          {/* Right-side context */}
                          {!isAskAi && displayGroup === "nav" && "href" in item && (
                            <span className="hidden truncate text-[11px] text-muted-foreground/60 sm:block max-w-[140px]">
                              {(item as CommandItemNav).href}
                            </span>
                          )}
                          {isAskAi && (
                            <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Enter
                            </span>
                          )}
                        </button>
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </div>
          </ScrollArea>

          {/* Footer hint */}
          <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span>
              <kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> navigate
              &nbsp;&nbsp;
              <kbd className="rounded border bg-muted px-1 font-mono">↵</kbd> open
            </span>
            {!isEmptyQuery && (
              <span>
                {filteredNav.length + filteredStatic.length} pages · {searchResults.length} records
              </span>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
