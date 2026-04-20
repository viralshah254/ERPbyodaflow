"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter, usePathname } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";
import { useCopilotStore } from "@/stores/copilot-store";
import { getTutorialForRoute } from "@/config/tutorial";
import {
  COMMAND_NAV_ITEMS,
  COMMAND_CREATE_ITEMS,
  COMMAND_COPILOT_ITEMS,
  getCreateDocHref,
  type CommandItem,
} from "@/config/command-palette";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { searchErpApi, type ErpSearchHit } from "@/lib/api/erp-search";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import * as Icons from "lucide-react";

function filterItems(query: string, allItems: CommandItem[]): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return allItems;
  const tokens = q.split(/\s+/).filter(Boolean);
  return allItems.filter((item) => {
    const label = item.label.toLowerCase();
    const keywords = (item.keywords ?? []).join(" ").toLowerCase();
    const searchable = `${label} ${keywords}`;
    return tokens.every((t) => searchable.includes(t));
  });
}

const GROUP_ORDER: Record<string, number> = { ask: -1, search: 0, nav: 1, create: 2, copilot: 3 };
const GROUP_LABELS: Record<string, string> = { ask: "Natural language", search: "ERP results", nav: "Navigate", create: "Create", copilot: "Copilot" };

/** Synthetic "Ask AI" item when user types a free-form query (intent preview). */
interface AskAiItem {
  id: string;
  group: "ask";
  label: string;
  prompt: string;
  intentPreview?: string;
}

interface SearchResultItem {
  id: string;
  group: "search";
  label: string;
  href: string;
  subtitle?: string;
  entityType: ErpSearchHit["entityType"];
}

function sortByGroup(items: CommandItem[]): CommandItem[] {
  return [...items].sort((a, b) => (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99));
}

function getIntentPreview(query: string): string {
  const q = query.trim().toLowerCase();
  if (q.includes("stock") || q.includes("inventory") || q.includes("sku")) return "Query inventory · Run forecast · Filter by criteria";
  if (q.includes("approv") || q.includes("pending")) return "Open approvals · Filter pending items";
  if (q.includes("cash") || q.includes("margin") || q.includes("forecast")) return "Finance intelligence · Cash or margin view";
  if (q.includes("order") || q.includes("po") || q.includes("purchase")) return "Purchasing · Orders or requests";
  if (q.includes("production") || q.includes("schedule") || q.includes("work order")) return "Production · Schedules or work orders";
  return "Interpret as ERP query · Execute or show results";
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const copilotEnabled = useCopilotFeatureEnabled();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const openDrawer = useCopilotStore((s) => s.openDrawer);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const setContext = useCopilotStore((s) => s.setContext);

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(0);
  const [searchResults, setSearchResults] = React.useState<SearchResultItem[]>([]);

  const allItems = React.useMemo<CommandItem[]>(
    () => [
      ...COMMAND_NAV_ITEMS,
      ...COMMAND_CREATE_ITEMS,
      ...(copilotEnabled ? COMMAND_COPILOT_ITEMS : []),
    ],
    [copilotEnabled]
  );

  const filtered = React.useMemo(() => filterItems(query, allItems), [query, allItems]);
  const sorted = React.useMemo(() => sortByGroup(filtered), [filtered]);

  React.useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      searchErpApi(query)
        .then((response) => {
          if (!active) return;
          setSearchResults(
            response.hits.slice(0, 6).map((hit) => ({
              id: `search-${hit.entityType}-${hit.id}`,
              group: "search",
              label: hit.title,
              href: hit.href,
              subtitle: hit.subtitle,
              entityType: hit.entityType,
            }))
          );
        })
        .catch(() => {
          if (active) setSearchResults([]);
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const displayList = React.useMemo(() => {
    const askAiItem: AskAiItem | null =
      copilotEnabled && query.trim()
        ? {
            id: "ask-ai",
            group: "ask",
            label: "Ask AI",
            prompt: query.trim(),
            intentPreview: getIntentPreview(query),
          }
        : null;
    const base = searchResults.length > 0 ? [...searchResults, ...sorted] : sorted;
    if (!askAiItem) return base;
    return [askAiItem, ...base];
  }, [copilotEnabled, query, sorted, searchResults]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
        if (!open) {
          setQuery("");
          setSelected(0);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  React.useEffect(() => {
    setSelected(0);
  }, [query]);

  React.useEffect(() => {
    if (selected >= displayList.length) setSelected(Math.max(0, displayList.length - 1));
  }, [displayList.length, selected]);

  const handleSelect = React.useCallback(
    (item: CommandItem | AskAiItem | SearchResultItem) => {
      if (item.group === "ask" && "prompt" in item) {
        setOpen(false);
        openDrawerWithPrompt((item as AskAiItem).prompt);
        return;
      }
      if (item.group === "search" && "href" in item) {
        setOpen(false);
        router.push(item.href);
        return;
      }
      if (item.group === "nav" && "href" in item) {
        setOpen(false);
        router.push(item.href);
        return;
      }
      if (item.group === "create" && "docType" in item) {
        setOpen(false);
        router.push(getCreateDocHref(item.docType));
        return;
      }
      if (item.group === "copilot" && "copilotPrompt" in item) {
        setOpen(false);
        const copilotItem = item as { id?: string; copilotPrompt?: string };
        if (copilotItem.id === "copilot-ask" && pathname) {
          const tutorial = getTutorialForRoute(pathname);
          if (tutorial) {
            setContext({
              page: tutorial.itemLabel ?? tutorial.chapterTitle,
              route: pathname,
            });
            openDrawerWithPrompt(tutorial.copilotPrompt);
          } else {
            setContext({ route: pathname });
            openDrawerWithPrompt("Explain this page and suggest next steps.");
          }
        } else {
          const prompt = copilotItem.copilotPrompt;
          if (prompt?.trim()) openDrawerWithPrompt(prompt);
          else openDrawer();
        }
      }
    },
    [router, pathname, setOpen, openDrawer, openDrawerWithPrompt, setContext]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = displayList;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % Math.max(1, list.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s - 1 + list.length) % Math.max(1, list.length));
    } else if (e.key === "Enter" && list.length > 0 && list[selected]) {
      e.preventDefault();
      handleSelect(list[selected]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 rounded-lg border bg-card shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3">
              <Icons.Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder={
                  copilotEnabled
                    ? "Search pages, create documents, ask Copilot..."
                    : "Search pages, create documents..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
              <kbd className="hidden sm:inline-flex h-6 items-center rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground">
                ESC
              </kbd>
            </div>
            <ScrollArea className="mt-2 h-[min(60vh,400px)]">
              <div className="space-y-1 pr-2">
                {displayList.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No results.
                  </div>
                ) : (
                  (() => {
                    let prevGroup = "";
                    return displayList.map((item, i) => {
                      const showHeader = prevGroup !== item.group;
                      if (showHeader) prevGroup = item.group;
                      const isSelected = i === selected;
                      const isAskAi = item.group === "ask";
                      const iconKey =
                        item.group === "search"
                          ? "Search"
                          : "icon" in item
                            ? (item.icon ?? "Circle")
                            : "MessageSquare";
                      const Icon = (Icons[iconKey as keyof typeof Icons] || Icons.Circle) as React.ComponentType<{ className?: string }>;
                      return (
                        <React.Fragment key={item.id}>
                          {showHeader && (
                            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur py-1.5 px-2 text-xs font-medium text-muted-foreground">
                              {GROUP_LABELS[item.group] ?? item.group}
                            </div>
                          )}
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                              isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                            )}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelected(i)}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <span className="block">{item.label}</span>
                              {item.group === "search" && "subtitle" in item && item.subtitle ? (
                                <span className="block truncate text-xs text-muted-foreground mt-0.5">
                                  {item.subtitle}
                                </span>
                              ) : null}
                              {isAskAi && "intentPreview" in item && (
                                <span className="block text-xs text-muted-foreground truncate mt-0.5">
                                  {item.intentPreview}
                                </span>
                              )}
                            </div>
                            {item.group === "nav" && "href" in item && !isAskAi && (
                              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{item.href}</span>
                            )}
                            {isAskAi && (
                              <span className="text-xs text-muted-foreground">Confirm</span>
                            )}
                          </button>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </div>
            </ScrollArea>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
