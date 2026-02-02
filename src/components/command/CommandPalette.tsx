"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";
import { useCopilotStore } from "@/stores/copilot-store";
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
import * as Icons from "lucide-react";

const ALL_ITEMS: CommandItem[] = [
  ...COMMAND_NAV_ITEMS,
  ...COMMAND_CREATE_ITEMS,
  ...COMMAND_COPILOT_ITEMS,
];

function filterItems(query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_ITEMS;
  const tokens = q.split(/\s+/).filter(Boolean);
  return ALL_ITEMS.filter((item) => {
    const label = item.label.toLowerCase();
    const keywords = (item.keywords ?? []).join(" ").toLowerCase();
    const searchable = `${label} ${keywords}`;
    return tokens.every((t) => searchable.includes(t));
  });
}

const GROUP_ORDER: Record<string, number> = { nav: 0, create: 1, copilot: 2 };
const GROUP_LABELS: Record<string, string> = { nav: "Navigate", create: "Create", copilot: "Copilot" };

function sortByGroup(items: CommandItem[]): CommandItem[] {
  return [...items].sort((a, b) => (GROUP_ORDER[a.group] ?? 99) - (GROUP_ORDER[b.group] ?? 99));
}

export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const openDrawer = useCopilotStore((s) => s.openDrawer);
  const openDrawerWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(0);

  const filtered = React.useMemo(() => filterItems(query), [query]);
  const sorted = React.useMemo(() => sortByGroup(filtered), [filtered]);

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

  const handleSelect = React.useCallback(
    (item: CommandItem) => {
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
        const prompt = (item as { copilotPrompt?: string }).copilotPrompt;
        if (prompt?.trim()) openDrawerWithPrompt(prompt);
        else openDrawer();
      }
    },
    [router, setOpen, openDrawer, openDrawerWithPrompt]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % Math.max(1, sorted.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s - 1 + sorted.length) % Math.max(1, sorted.length));
    } else if (e.key === "Enter" && sorted.length > 0 && sorted[selected]) {
      e.preventDefault();
      handleSelect(sorted[selected]);
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
                placeholder="Search pages, create documents, ask Copilot..."
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
                {sorted.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No results.
                  </div>
                ) : (
                  (() => {
                    let prevGroup = "";
                    return sorted.map((item, i) => {
                      const showHeader = prevGroup !== item.group;
                      if (showHeader) prevGroup = item.group;
                      const isSelected = i === selected;
                      const iconKey = item.icon ?? "Circle";
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
                            <span className="flex-1">{item.label}</span>
                            {item.group === "nav" && "href" in item && (
                              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{item.href}</span>
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
