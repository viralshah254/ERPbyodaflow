"use client";

/**
 * FMCG-only master–detail for many named price tags.
 * Seafood / CoolCatch keep the classic price-lists table.
 */

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FmcgPriceTagItemsEditor } from "@/components/pricing/FmcgPriceTagItemsEditor";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import type { PriceList } from "@/lib/products/pricing-types";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export function FmcgPriceTagsWorkspace({
  lists,
  loading,
  selectedId,
  selected,
  canDelete,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onSaved,
}: {
  lists: PriceList[];
  loading: boolean;
  selectedId: string;
  selected: PriceList | null;
  canDelete: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (pl: PriceList) => void;
  onDelete: (pl: PriceList) => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter(
      (pl) =>
        pl.name.toLowerCase().includes(q) ||
        pl.currency.toLowerCase().includes(q)
    );
  }, [lists, query]);

  if (!loading && lists.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-6 py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icons.Tags className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">No price tags yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create tags for commercial levels (e.g. Naivas, Premium, Distributors). Then set price per
            piece for each product on that tag.
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Icons.Plus className="mr-2 h-4 w-4" />
          Add price tag
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[min(70vh,720px)] flex-col overflow-hidden rounded-xl border bg-card lg:flex-row">
      {/* Tag list */}
      <aside className="flex w-full shrink-0 flex-col border-b lg:w-72 lg:border-b-0 lg:border-r xl:w-80">
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tags ({lists.length})
            </p>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onAdd}>
              <Icons.Plus className="h-3.5 w-3.5" />
              <span className="sr-only">Add price tag</span>
            </Button>
          </div>
          <div className="relative">
            <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tags…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="relative max-h-56 flex-1 overflow-y-auto lg:max-h-none">
          {/* Soft indicator only — never replace the tag list (keeps click target visible). */}
          {loading && lists.length > 0 ? <TopProgressBar active /> : null}
          {loading && lists.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No tags match “{query}”.</p>
          ) : (
            <ul className="p-1.5" role="listbox" aria-label="Price tags">
              {filtered.map((pl) => {
                const active = selectedId === pl.id;
                const priced = pl.pricedSkuCount ?? 0;
                return (
                  <li key={pl.id}>
                    <div
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "group flex w-full items-start gap-1 rounded-lg transition-colors",
                        active
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/25"
                          : "hover:bg-muted/70"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(pl.id)}
                        className="flex min-w-0 flex-1 items-start gap-2 px-2.5 py-2 text-left"
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            active ? "bg-primary" : "bg-muted-foreground/25"
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{pl.name}</span>
                            {pl.isDefault ? (
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                Default
                              </Badge>
                            ) : null}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{pl.currency}</span>
                            <span aria-hidden>·</span>
                            <span>
                              {priced} SKU{priced === 1 ? "" : "s"} priced
                            </span>
                          </span>
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "mt-1 mr-1 h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
                              active && "opacity-100"
                            )}
                          >
                            <Icons.MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Tag actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSelect(pl.id)}>
                            <Icons.Tag className="mr-2 h-3.5 w-3.5" />
                            Set piece prices
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(pl)}>
                            <Icons.Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit tag
                          </DropdownMenuItem>
                          {canDelete ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(pl)}
                              >
                                <Icons.Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Editor */}
      <section className="flex min-w-0 flex-1 flex-col" id="fmcg-price-tag-editor">
        {selected ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Editing prices for</p>
                <h2 className="truncate text-lg font-semibold tracking-tight">{selected.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.currency} · price per piece · packs calculate from packaging
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(selected)}>
                  <Icons.Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit tag
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/master/products">Products</Link>
                </Button>
              </div>
            </header>
            <div className="flex-1 overflow-auto p-4 sm:p-5">
              <FmcgPriceTagItemsEditor priceListId={selected.id} onSaved={onSaved} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Icons.MousePointerClick className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Select a price tag on the left to set piece prices.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
