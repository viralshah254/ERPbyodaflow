"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";

export type SearchableSelectOption = {
  id: string;
  label: string;
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
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
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
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
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
                  <span className="truncate">{option.label}</span>
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
