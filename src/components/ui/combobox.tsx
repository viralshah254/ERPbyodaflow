"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Show a "+ Create …" affordance (and Enter-to-create). Return the option to select, or void. */
  onCreate?: (label: string) => void | Promise<void>;
  /** Per-option rename. When provided, an edit action shows on each row. */
  onRename?: (value: string, newLabel: string) => void | Promise<void>;
  /** Per-option delete. When provided, a delete action with inline confirm shows on each row. */
  onDelete?: (value: string) => void | Promise<void>;
  /** Extra explanatory line shown in the inline delete confirm. */
  deleteHint?: (option: ComboboxOption) => string | undefined;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches.",
  disabled = false,
  className,
  onCreate,
  onRename,
  onDelete,
  deleteHint,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [editingValue, setEditingValue] = React.useState<string | null>(null);
  const [editLabel, setEditLabel] = React.useState("");
  const [confirmDeleteValue, setConfirmDeleteValue] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const selected = React.useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const exactMatch = React.useMemo(
    () => options.some((o) => o.label.trim().toLowerCase() === query.trim().toLowerCase()),
    [options, query]
  );
  const canCreate = Boolean(onCreate) && query.trim().length > 0 && !exactMatch;

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setEditingValue(null);
      setConfirmDeleteValue(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!onCreate || !query.trim()) return;
    setBusy(true);
    try {
      await onCreate(query.trim());
      setQuery("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (val: string) => {
    if (!onRename) return;
    const next = editLabel.trim();
    if (!next) return;
    setBusy(true);
    try {
      await onRename(val, next);
      setEditingValue(null);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (val: string) => {
    if (!onDelete) return;
    setBusy(true);
    try {
      await onDelete(val);
      setConfirmDeleteValue(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <Icons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => {
          // Let our search input grab focus instead of the first row.
          e.preventDefault();
        }}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Icons.Search className="h-4 w-4 shrink-0 opacity-50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canCreate) void handleCreate();
                else if (filtered.length > 0) {
                  onChange(filtered[0].value);
                  setOpen(false);
                }
              }
            }}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 && !canCreate ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((option) => {
              const isSelected = option.value === value;
              const isEditing = editingValue === option.value;
              const isConfirming = confirmDeleteValue === option.value;

              if (isConfirming) {
                return (
                  <div key={option.value} className="space-y-1.5 bg-destructive/5 px-3 py-2">
                    <p className="text-sm font-medium text-destructive">Delete “{option.label}”?</p>
                    {deleteHint?.(option) ? (
                      <p className="text-xs text-muted-foreground">{deleteHint(option)}</p>
                    ) : null}
                    <div className="flex justify-end gap-2 pt-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => setConfirmDeleteValue(null)}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7"
                        onClick={() => void handleDelete(option.value)}
                        disabled={busy}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              }

              if (isEditing) {
                return (
                  <div key={option.value} className="flex items-center gap-1.5 px-2 py-1.5">
                    <Input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleRename(option.value);
                        } else if (e.key === "Escape") {
                          setEditingValue(null);
                        }
                      }}
                      className="h-8"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-primary"
                      onClick={() => void handleRename(option.value)}
                      disabled={busy || !editLabel.trim()}
                      aria-label="Save name"
                    >
                      <Icons.Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setEditingValue(null)}
                      aria-label="Cancel"
                    >
                      <Icons.X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              }

              return (
                <div
                  key={option.value}
                  className="group flex items-center gap-1 px-1"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <Icons.Check
                      className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{option.label}</span>
                  </button>
                  <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {onRename ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingValue(option.value);
                          setEditLabel(option.label);
                          setConfirmDeleteValue(null);
                        }}
                        aria-label={`Rename ${option.label}`}
                      >
                        <Icons.Pencil className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {onDelete ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setConfirmDeleteValue(option.value);
                          setEditingValue(null);
                        }}
                        aria-label={`Delete ${option.label}`}
                      >
                        <Icons.Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {canCreate ? (
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <Icons.Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">Create “{query.trim()}”</span>
            </button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
