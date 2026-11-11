"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";

export type SearchableSelectOption = {
  id: string;
  label: string;
  /** Extra text matched by search (e.g. KRA PIN, SKU) without changing the visible label. */
  keywords?: string;
};

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  allowClear?: boolean;
  wrapLabels?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select option",
  searchPlaceholder = "Type to search...",
  emptyMessage = "No options found.",
  disabled = false,
  allowClear = false,
  wrapLabels = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const selected = React.useMemo(
    () => options.find((option) => option.id === value),
    [options, value]
  );

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => {
      const hay = `${option.label} ${option.keywords ?? ""}`.toLowerCase();
      return hay.includes(normalized);
    });
  }, [options, query]);

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
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className={`relative${className ? ` ${className}` : ""}`} ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        className={cn("w-full justify-between font-normal", wrapLabels && "h-auto min-h-10 gap-1 px-2 text-left")}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={wrapLabels ? "min-w-0 whitespace-normal break-words" : "truncate"}>{selected?.label ?? placeholder}</span>
        <Icons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
      </Button>
      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-background p-2 shadow-md">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
          />
          <div className="mt-2 max-h-60 overflow-auto rounded border">
            {allowClear && value ? (
              <button
                type="button"
                className="flex w-full items-center px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                onClick={() => {
                  onValueChange("");
                  setOpen(false);
                }}
              >
                Clear selection
              </button>
            ) : null}
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onValueChange(option.id);
                    setOpen(false);
                  }}
                >
                  <span className={wrapLabels ? "min-w-0 whitespace-normal break-words" : "truncate"}>{option.label}</span>
                  {option.id === value ? <Icons.Check className="ml-2 h-4 w-4" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
