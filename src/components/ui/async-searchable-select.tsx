"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
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
  recentStorageKey?: string;
  recentItemsLabel?: string;
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
  recentStorageKey,
  recentItemsLabel = "Recent",
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
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const requestIdRef = React.useRef(0);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

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

  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
    const timeoutId = window.setTimeout(() => {
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
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadOptions, minSearchLength, open, query]);

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

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="truncate text-left">{effectiveSelected?.label ?? placeholder}</span>
        <Icons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
      </Button>
      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-background p-2 shadow-md">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            autoFocus
          />
          <div className="mt-2 max-h-64 overflow-auto rounded border">
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
                  className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted ${
                    highlightedIndex === index ? "bg-muted" : ""
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => commitSelection(option)}
                >
                  <div className="min-w-0">
                    {showRecentHeading && index === 0 ? (
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {recentItemsLabel}
                      </span>
                    ) : null}
                    <span className="block truncate">{option.label}</span>
                    {option.description ? (
                      <span className="block truncate text-xs text-muted-foreground">
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
        </div>
      ) : null}
    </div>
  );
}
