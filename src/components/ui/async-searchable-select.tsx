"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export type AsyncSearchableSelectOption = {
  id: string;
  label: string;
  description?: string;
  badges?: Array<{
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  }>;
};

interface AsyncSearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  onOptionSelect?: (option: AsyncSearchableSelectOption | null) => void;
  loadOptions: (query: string) => Promise<AsyncSearchableSelectOption[]>;
  selectedOption?: AsyncSearchableSelectOption | null;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  allowClear?: boolean;
  minSearchLength?: number;
  /** Debounce before calling loadOptions (ms). Use 0 for instant local filtering. Default 250. */
  searchDebounceMs?: number;
  /** When true, option and trigger labels wrap (full text visible) instead of ellipsis. */
  wrapLabels?: boolean;
  /** Extra classes for the dropdown panel (width, shadow). */
  dropdownClassName?: string;
  /** Extra classes for the trigger button (e.g. min-height for multi-line label). */
  triggerClassName?: string;
  /** Max height of the scrollable option list. Default max-h-64. */
  listMaxHeightClassName?: string;
  /**
   * When true (default), the dropdown is portaled to document.body with fixed positioning so it is not
   * clipped by table overflow or scroll parents (e.g. document line editors).
   */
  floating?: boolean;
  /**
   * When floating, portal the panel to this element instead of document.body. Use inside Radix Dialog/Sheet
   * so option clicks are not treated as “outside” the modal (which would swallow the interaction).
   */
  portalContainer?: HTMLElement | null;
  recentStorageKey?: string;
  recentItemsLabel?: string;
  /**
   * When provided, a sticky "＋ [createNewLabel]" button appears at the bottom of the dropdown.
   * Called with the current search query so the caller can pre-fill a creation form.
   * Closes the dropdown before calling the handler.
   */
  onCreateNew?: (searchQuery: string) => void;
  /** Label for the create-new button. Defaults to "Add new". */
  createNewLabel?: string;
}

export function AsyncSearchableSelect({
  value,
  onValueChange,
  onOptionSelect,
  loadOptions,
  selectedOption,
  placeholder = "Select option",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No options found.",
  disabled = false,
  allowClear = false,
  minSearchLength = 0,
  searchDebounceMs = 250,
  wrapLabels = false,
  dropdownClassName,
  triggerClassName,
  listMaxHeightClassName = "max-h-[min(24rem,50vh)]",
  floating = true,
  portalContainer = null,
  recentStorageKey,
  recentItemsLabel = "Recent",
  onCreateNew,
  createNewLabel = "Add new",
}: AsyncSearchableSelectProps) {
  const orgId = useAuthStore((s) => s.org?.orgId);
  // Scope recent items per org so selections from one org never bleed into another
  const scopedRecentKey = recentStorageKey && orgId
    ? `${recentStorageKey}:${orgId}`
    : recentStorageKey;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<AsyncSearchableSelectOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [recentOptions, setRecentOptions] = React.useState<AsyncSearchableSelectOption[]>([]);
  const [lastSelectedOption, setLastSelectedOption] = React.useState<AsyncSearchableSelectOption | null>(selectedOption ?? null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [floatingPos, setFloatingPos] = React.useState<{
    top: number;
    left: number;
    width: number;
    maxH: number;
  } | null>(null);
  const requestIdRef = React.useRef(0);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const updateFloatingPosition = React.useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minPanelW = 320;
    let width = Math.max(rect.width, minPanelW);
    width = Math.min(width, vw - margin * 2);
    let left = rect.left;
    if (left + width > vw - margin) {
      left = Math.max(margin, vw - width - margin);
    }
    const searchBlock = 48;
    const belowTop = rect.bottom + margin;
    const spaceBelow = vh - belowTop - margin;
    const spaceAbove = rect.top - margin;
    let top: number;
    let maxH: number;
    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      top = belowTop;
      maxH = Math.max(160, Math.min(480, spaceBelow));
    } else {
      maxH = Math.max(160, Math.min(480, spaceAbove - searchBlock - margin));
      top = Math.max(margin, rect.top - maxH - searchBlock - margin * 2);
    }
    setFloatingPos({ top, left, width, maxH });
  }, []);

  React.useEffect(() => {
    if (!scopedRecentKey) {
      setRecentOptions([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(scopedRecentKey);
      if (!raw) {
        setRecentOptions([]);
        return;
      }
      const parsed = JSON.parse(raw) as AsyncSearchableSelectOption[];
      setRecentOptions(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecentOptions([]);
    }
  }, [scopedRecentKey]);

  const effectiveSelected = React.useMemo(() => {
    if (selectedOption && selectedOption.id === value) return selectedOption;
    if (value && lastSelectedOption?.id === value) return lastSelectedOption;
    return options.find((option) => option.id === value) ?? null;
  }, [lastSelectedOption, options, selectedOption, value]);

  const visibleOptions = React.useMemo(() => {
    if (query.trim()) return options;
    const deduped = [...recentOptions];
    for (const option of options) {
      if (!deduped.some((recent) => recent.id === option.id)) {
        deduped.push(option);
      }
    }
    return deduped;
  }, [options, query, recentOptions]);

  const persistRecentOption = React.useCallback(
    (option: AsyncSearchableSelectOption | null) => {
      if (!scopedRecentKey || !option) return;
      const nextOptions = [option, ...recentOptions.filter((item) => item.id !== option.id)].slice(0, 6);
      setRecentOptions(nextOptions);
      try {
        window.localStorage.setItem(scopedRecentKey, JSON.stringify(nextOptions));
      } catch {
        /* ignore */
      }
    },
    [recentOptions, scopedRecentKey]
  );

  React.useEffect(() => {
    if (!value) {
      setLastSelectedOption(null);
      return;
    }
    if (selectedOption?.id === value) {
      setLastSelectedOption(selectedOption);
    }
  }, [selectedOption, value]);

  React.useLayoutEffect(() => {
    if (!open || !floating) {
      setFloatingPos(null);
      return;
    }
    updateFloatingPosition();
    const onScrollOrResize = () => updateFloatingPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, floating, updateFloatingPosition]);

  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      const el = t instanceof Element ? t : t.parentElement;
      if (el?.closest?.("[data-async-searchable-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setOptions([]);
      setLoading(false);
      setHighlightedIndex(-1);
      return;
    }
    if (query.trim().length > 0 && query.trim().length < minSearchLength) {
      setOptions([]);
      setLoading(false);
      return;
    }
    const runLoad = () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      void loadOptions(query.trim())
        .then((nextOptions) => {
          if (requestId !== requestIdRef.current) return;
          setOptions(nextOptions);
          setHighlightedIndex(nextOptions.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setOptions([]);
          setHighlightedIndex(-1);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setLoading(false);
          }
        });
    };
    if (searchDebounceMs <= 0) {
      runLoad();
      return;
    }
    const timeoutId = window.setTimeout(runLoad, searchDebounceMs);
    return () => window.clearTimeout(timeoutId);
  }, [loadOptions, minSearchLength, open, query, searchDebounceMs]);

  const hint =
    query.trim().length > 0 && query.trim().length < minSearchLength
      ? `Type at least ${minSearchLength} characters to search.`
      : null;

  React.useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  React.useEffect(() => {
    if (!open) return;
    if (visibleOptions.length === 0) {
      setHighlightedIndex(-1);
      return;
    }
    setHighlightedIndex((current) =>
      current >= 0 && current < visibleOptions.length ? current : 0
    );
  }, [open, visibleOptions]);

  const commitSelection = React.useCallback(
    (option: AsyncSearchableSelectOption) => {
      setLastSelectedOption(option);
      persistRecentOption(option);
      onValueChange(option.id);
      onOptionSelect?.(option);
      setOpen(false);
    },
    [onOptionSelect, onValueChange, persistRecentOption]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => {
        const nextIndex = current < visibleOptions.length - 1 ? current + 1 : 0;
        return visibleOptions.length > 0 ? nextIndex : -1;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => {
        const nextIndex = current > 0 ? current - 1 : visibleOptions.length - 1;
        return visibleOptions.length > 0 ? nextIndex : -1;
      });
      return;
    }
    if (event.key === "Enter" && highlightedIndex >= 0 && visibleOptions[highlightedIndex]) {
      event.preventDefault();
      commitSelection(visibleOptions[highlightedIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const showRecentHeading = !query.trim() && recentOptions.length > 0;

  const listScrollStyle =
    floating && floatingPos
      ? { maxHeight: floatingPos.maxH }
      : undefined;

  const panelInner = (
    <>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={searchPlaceholder}
        autoFocus
        className="bg-background"
      />
      <div
        className={cn(
          "mt-2 overflow-auto rounded-md border bg-muted/20",
          !(floating && floatingPos) && listMaxHeightClassName
        )}
        style={listScrollStyle}
      >
        {allowClear && value ? (
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
            onClick={() => {
              setLastSelectedOption(null);
              onValueChange("");
              onOptionSelect?.(null);
              setOpen(false);
            }}
          >
            Clear selection
          </button>
        ) : null}
        {hint ? (
          <div className="p-3 text-sm text-muted-foreground">{hint}</div>
        ) : loading ? (
          <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        ) : visibleOptions.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          visibleOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted ${
                highlightedIndex === index ? "bg-muted" : ""
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commitSelection(option);
              }}
            >
              <div className="min-w-0 flex-1">
                {showRecentHeading && index === 0 ? (
                  <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {recentItemsLabel}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "block",
                    wrapLabels ? "whitespace-normal break-words" : "truncate"
                  )}
                >
                  {option.label}
                </span>
                {option.description ? (
                  <span
                    className={cn(
                      "block text-xs text-muted-foreground",
                      wrapLabels ? "whitespace-normal break-words" : "truncate"
                    )}
                  >
                    {option.description}
                  </span>
                ) : null}
                {option.badges?.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {option.badges.map((badge: { label: string; variant?: "default" | "secondary" | "destructive" | "outline" }) => (
                      <Badge key={`${option.id}-${badge.label}`} variant={badge.variant ?? "outline"} className="px-1.5 py-0 text-[10px]">
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              {option.id === value ? <Icons.Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            </button>
          ))
        )}
      </div>
      {onCreateNew ? (
        <button
          type="button"
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-primary/10 border-t border-border/50"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            onCreateNew(query.trim());
          }}
        >
          <Icons.Plus className="h-4 w-4 shrink-0" />
          {createNewLabel}
        </button>
      ) : null}
    </>
  );

  const panelShell = (opts: { className?: string; style?: React.CSSProperties }) => (
    <div
      ref={panelRef}
      data-async-searchable-panel=""
      className={opts.className}
      style={opts.style}
      role="listbox"
      aria-label={searchPlaceholder}
    >
      {panelInner}
    </div>
  );

  const floatingReady = floating && open && floatingPos && typeof document !== "undefined";
  const portalTarget =
    portalContainer != null ? portalContainer : typeof document !== "undefined" ? document.body : null;

  return (
    <div className={cn(!floating && "relative")}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between font-normal gap-2 h-auto min-h-10 py-2",
          wrapLabels ? "items-start" : "items-center",
          triggerClassName
        )}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span
          className={cn(
            "text-left flex-1 min-w-0",
            wrapLabels ? "whitespace-normal break-words line-clamp-2" : "truncate"
          )}
          title={wrapLabels ? (effectiveSelected?.label ?? undefined) : undefined}
        >
          {effectiveSelected?.label ?? placeholder}
        </span>
        <Icons.ChevronsUpDown className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
      </Button>
      {open && !floating
        ? panelShell({
            className: cn(
              "absolute z-50 mt-2 left-0 rounded-lg border bg-popover p-2 text-popover-foreground shadow-xl",
              "min-w-full w-max max-w-[min(100vw-1.5rem,48rem)]",
              dropdownClassName
            ),
          })
        : null}
      {floatingReady && portalTarget
        ? createPortal(
            panelShell({
              className: cn(
                "fixed z-[400] rounded-lg border bg-popover p-2 text-popover-foreground shadow-2xl outline-none",
                "ring-1 ring-border/60 animate-in fade-in-0 zoom-in-95 duration-100",
                dropdownClassName
              ),
              style: {
                top: floatingPos!.top,
                left: floatingPos!.left,
                width: floatingPos!.width,
                maxHeight: floatingPos!.maxH + 120,
              },
            }),
            portalTarget
          )
        : null}
    </div>
  );
}
