"use client";

import * as React from "react";
import { Check, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type StoreOption = { id: string; code?: string; name?: string };

const WINDOW = 40;

/** "C4 FRIDAY — C4 FRIDAY" reads as noise; show a code only when it adds something. */
export function storeOptionLabel(store: StoreOption): string {
  const code = store.code?.trim();
  const name = store.name?.trim();
  if (code && name && code.toLowerCase() !== name.toLowerCase()) return `${code} — ${name}`;
  return name || code || store.id;
}

type Common = {
  label: string;
  hint?: string;
  stores: StoreOption[];
  loading?: boolean;
  disabled?: boolean;
  recommendedId?: string;
  recommendedReason?: string;
  searchPlaceholder: string;
};

type Props = Common & (
  | { mode: "multiple"; value: string[]; onChange: (ids: string[]) => void }
  | { mode: "single"; value: string; onChange: (id: string) => void }
);

/** Collapses to the chosen store(s) once picked, so the full catalogue only renders while choosing. */
export function StorePicker(props: Props) {
  const { label, hint, stores, loading, disabled, recommendedId, recommendedReason, searchPlaceholder } = props;
  const selected = props.mode === "multiple" ? props.value : props.value ? [props.value] : [];
  const [editing, setEditing] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const changeRef = React.useRef<HTMLButtonElement>(null);
  const listId = React.useId();
  const open = editing || selected.length === 0;

  const byId = React.useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const chosen = selected.map((id) => byId.get(id) ?? { id });

  const q = query.trim().toLowerCase();
  const pinned = new Set([...selected, recommendedId ?? ""].filter(Boolean));
  const matches = open
    ? stores.filter((store) => pinned.has(store.id) || !q || storeOptionLabel(store).toLowerCase().includes(q))
    : [];
  const head = matches.filter((store) => pinned.has(store.id));
  const rest = matches.filter((store) => !pinned.has(store.id));
  const visible = q ? [...head, ...rest] : [...head, ...rest.slice(0, WINDOW)];
  const hidden = matches.length - visible.length;

  React.useEffect(() => {
    setActive((index) => Math.min(index, Math.max(visible.length - 1, 0)));
  }, [query, visible.length]);

  React.useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId, open, visible.length]);

  function close() {
    setEditing(false);
    setQuery("");
    window.requestAnimationFrame(() => changeRef.current?.focus());
  }

  function startEditing() {
    setEditing(true);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  function toggle(id: string) {
    if (props.mode === "single") {
      props.onChange(id);
      close();
      return;
    }
    const next = props.value.includes(id) ? props.value.filter((item) => item !== id) : [...props.value, id];
    props.onChange(next);
  }

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      {!open ? (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
          <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5" aria-label={`Selected ${label.toLowerCase()}`}>
            {chosen.map((store) => (
              <li key={store.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-background px-2 py-0.5 text-sm ring-1 ring-border">
                <span className="truncate">{storeOptionLabel(store)}</span>
                {store.id === recommendedId ? (
                  <span className="shrink-0 text-[11px] font-medium text-primary" title={recommendedReason}>Recommended</span>
                ) : null}
              </li>
            ))}
          </ul>
          <Button
            ref={changeRef}
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-primary"
            aria-expanded={false}
            aria-controls={listId}
            onClick={startEditing}
          >
            Change
          </Button>
        </div>
      ) : (
        <div
          className="space-y-2 rounded-lg border p-2"
          onKeyDown={(event) => {
            if (event.key === "Escape" && selected.length > 0) {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              ref={searchRef}
              aria-label={searchPlaceholder}
              aria-activedescendant={visible[active] ? `${listId}-${active}` : undefined}
              aria-controls={listId}
              placeholder={searchPlaceholder}
              className="h-9 pl-8"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (!visible.length) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, visible.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  const store = visible[active];
                  if (store) toggle(store.id);
                }
              }}
            />
          </div>
          <div id={listId} className="max-h-56 space-y-0.5 overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">Loading stores…</p>
            ) : visible.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">{stores.length === 0 ? "No stores found." : "No store matches that search."}</p>
            ) : visible.map((store, index) => {
              const isSelected = selected.includes(store.id);
              return (
                <label
                  key={store.id}
                  id={`${listId}-${index}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60",
                    isSelected && "bg-primary/10",
                    index === active && "ring-1 ring-inset ring-primary",
                  )}
                  onMouseEnter={() => setActive(index)}
                >
                  <input
                    type={props.mode === "single" ? "radio" : "checkbox"}
                    name={props.mode === "single" ? listId : undefined}
                    className="h-4 w-4 shrink-0 accent-primary"
                    checked={isSelected}
                    onChange={() => toggle(store.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{storeOptionLabel(store)}</span>
                  {store.id === recommendedId ? (
                    <span title={recommendedReason} className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Recommended</span>
                  ) : null}
                </label>
              );
            })}
          </div>
          {hidden > 0 ? <p className="px-2 text-xs text-muted-foreground">Type to find the other {hidden} stores.</p> : null}
          {selected.length > 0 ? (
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <span className="px-1 text-xs text-muted-foreground">{selected.length} selected</span>
              {props.mode === "multiple" ? (
                <Button type="button" size="sm" className="h-7" onClick={close}>
                  <Check className="mr-1.5 h-3.5 w-3.5" />Done
                </Button>
              ) : (
                <Button type="button" size="sm" variant="ghost" className="h-7" onClick={close}>Keep current</Button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </fieldset>
  );
}
