"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchProductsPageApi } from "@/lib/api/products";
import type { ProductRow } from "@/lib/types/masters";
import { productTypeLabel, type ProductKind } from "@/lib/products/product-type";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type ProductTypeFilter = "" | ProductKind;

const TYPE_FILTER_OPTIONS: Array<{ value: ProductTypeFilter; label: string }> = [
  { value: "", label: "All types" },
  { value: "FINISHED", label: "Finished goods" },
  { value: "RAW", label: "Purchased / raw" },
  { value: "BOTH", label: "Stock (buy & sell)" },
];

function defaultTypeFilter(productFilter: "purchasable" | "sellable" | "all"): ProductTypeFilter {
  if (productFilter === "sellable") return "FINISHED";
  if (productFilter === "purchasable") return "RAW";
  return "";
}

export type CatalogAddItem = {
  product: ProductRow;
  qty: number;
  asNewLine: boolean;
};

type DocumentProductPickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** purchasable | sellable | all — matches document line filter. */
  productFilter?: "purchasable" | "sellable" | "all";
  fmcgOrg?: boolean;
  /** Catalog already loaded for the lines step. */
  products?: ProductRow[];
  loading?: boolean;
  priceLabel?: (product: ProductRow) => string;
  groupKey?: (product: ProductRow) => string;
  groupLabel?: (key: string) => string;
  groupOptions?: Array<{ key: string; label: string }>;
  existingProductIds?: string[];
  onAddMany?: (items: CatalogAddItem[]) => void;
  /** @deprecated Prefer onAddMany. Kept so older callers still compile. */
  onConfirm?: (products: ProductRow[]) => void;
};

const PAGE_SIZE = 40;

function rowQty(map: Record<string, string>, id: string): number {
  const raw = map[id];
  const n = raw == null || raw === "" ? 1 : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function DocumentProductPickerSheet({
  open,
  onOpenChange,
  productFilter = "sellable",
  fmcgOrg = false,
  products = [],
  loading: catalogLoading = false,
  priceLabel,
  groupKey,
  groupLabel,
  groupOptions = [],
  existingProductIds = [],
  onAddMany,
  onConfirm,
}: DocumentProductPickerSheetProps) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<ProductTypeFilter>(() =>
    defaultTypeFilter(productFilter)
  );
  const [categoryKey, setCategoryKey] = React.useState<string | null>(null);
  const [remoteItems, setRemoteItems] = React.useState<ProductRow[]>([]);
  const [cursor, setCursor] = React.useState<string | null>("0");
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [selected, setSelected] = React.useState<Map<string, ProductRow>>(new Map());
  const [qtyById, setQtyById] = React.useState<Record<string, string>>({});
  const [highlight, setHighlight] = React.useState(0);
  const [addedIds, setAddedIds] = React.useState<Set<string>>(new Set());
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const loadGen = React.useRef(0);
  const existing = React.useMemo(() => new Set(existingProductIds), [existingProductIds]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter(defaultTypeFilter(productFilter));
    setCategoryKey(null);
    setSelected(new Map());
    setQtyById({});
    setRemoteItems([]);
    setCursor("0");
    setHasMore(false);
    setHighlight(0);
    setAddedIds(new Set());
    const focusId = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(focusId);
  }, [open, productFilter]);

  const loadPage = React.useCallback(
    async (opts: { reset: boolean; cursor: string | null; search: string }) => {
      const gen = ++loadGen.current;
      if (opts.reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const page = await fetchProductsPageApi({
          search: opts.search || undefined,
          status: "ACTIVE",
          purchasable: productFilter === "purchasable" ? true : undefined,
          sellable: productFilter === "sellable" ? true : undefined,
          productType: typeFilter || undefined,
          limit: PAGE_SIZE,
          cursor: opts.cursor ?? "0",
          includeStock: false,
        });
        if (gen !== loadGen.current) return;
        setRemoteItems((prev) => (opts.reset ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (e) {
        if (gen !== loadGen.current) return;
        toast.error(e instanceof Error ? e.message : "Failed to load products.");
        if (opts.reset) {
          setRemoteItems([]);
          setHasMore(false);
          setCursor(null);
        }
      } finally {
        if (gen === loadGen.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [productFilter, typeFilter]
  );

  React.useEffect(() => {
    if (!open) return;
    if (!debouncedSearch) {
      setRemoteItems([]);
      setHasMore(false);
      setCursor(null);
      return;
    }
    void loadPage({ reset: true, cursor: "0", search: debouncedSearch });
  }, [open, debouncedSearch, typeFilter, loadPage]);

  const merged = React.useMemo(() => {
    const byId = new Map<string, ProductRow>();
    for (const p of products) byId.set(p.id, p);
    for (const p of remoteItems) byId.set(p.id, p);
    return [...byId.values()];
  }, [products, remoteItems]);

  const visible = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    return merged.filter((p) => {
      if (typeFilter && p.productType && p.productType !== typeFilter) return false;
      if (categoryKey && groupKey && groupKey(p) !== categoryKey) return false;
      if (!tokens.length) return true;
      const hay = [p.sku, p.barcode ?? "", p.name, p.size ?? "", p.categoryName ?? "", p.category ?? "", p.productFamily ?? ""]
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [merged, debouncedSearch, typeFilter, categoryKey, groupKey]);

  React.useEffect(() => {
    setHighlight((i) => Math.min(i, Math.max(visible.length - 1, 0)));
  }, [visible.length]);

  const flashAdded = (id: string) => {
    setAddedIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setAddedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1200);
  };

  const emit = (items: CatalogAddItem[]) => {
    if (!items.length) return;
    if (onAddMany) onAddMany(items);
    else onConfirm?.(items.map((item) => item.product));
    for (const item of items) flashAdded(item.product.id);
  };

  const addOne = (product: ProductRow, asNewLine: boolean) => {
    emit([{ product, qty: rowQty(qtyById, product.id), asNewLine }]);
  };

  const toggle = (product: ProductRow) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.set(product.id, product);
      return next;
    });
  };

  const selectedCount = selected.size;

  const addSelected = () => {
    if (selectedCount === 0) {
      toast.error("Select at least one product.");
      return;
    }
    emit(
      [...selected.values()].map((product) => ({
        product,
        qty: rowQty(qtyById, product.id),
        asNewLine: false,
      }))
    );
    setSelected(new Map());
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(visible.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const product = visible[highlight];
      if (product) addOne(product, false);
    }
  };

  const showChips = !debouncedSearch && groupOptions.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-hidden rounded-lg border bg-background p-5 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Dialog.Title className="text-lg font-semibold">Add products</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                Click a product to add it. The dialog stays open so you can add the next one.
                {fmcgOrg ? " Set the quantity on the row before you click." : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Close">
                <Icons.X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
            <div className="relative">
              <Icons.Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (!e.target.value.trim()) setCategoryKey(null);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="Search name, SKU, barcode…"
                className="pl-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-product-type-filter" className="sr-only">
                Product type
              </Label>
              <select
                id="doc-product-type-filter"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ProductTypeFilter)}
              >
                {TYPE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showChips ? (
            <div className="flex flex-wrap gap-1.5">
              {groupOptions.map((opt) => {
                const active = categoryKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/60"
                    )}
                    onClick={() => setCategoryKey(active ? null : opt.key)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            ref={listRef}
            className="min-h-[16rem] flex-1 overflow-y-auto rounded-md border"
          >
            {(loading || catalogLoading) && visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Loading products…</p>
            ) : visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No products match
                {debouncedSearch ? ` “${debouncedSearch}”` : ""}
                {categoryKey && groupLabel ? ` in ${groupLabel(categoryKey)}` : ""}
                .
              </p>
            ) : (
              <ul>
                {visible.map((p, index) => {
                  const checked = selected.has(p.id);
                  const onOrder = existing.has(p.id);
                  const justAdded = addedIds.has(p.id);
                  const meta = [
                    p.sku,
                    p.size?.trim(),
                    groupKey && groupLabel ? groupLabel(groupKey(p)) : fmcgOrg ? (p.categoryName ?? p.category)?.trim() : p.productFamily?.trim(),
                    typeFilter ? undefined : productTypeLabel(p.productType),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        "flex items-center gap-2 border-b px-2 py-2 last:border-b-0",
                        index === highlight && "bg-muted/60",
                        justAdded && "bg-primary/10"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(p)}
                        aria-label={`Select ${p.name}`}
                      />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => addOne(p, false)}
                        onMouseEnter={() => setHighlight(index)}
                      >
                        <span className="block text-sm font-medium leading-snug">{p.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{meta}</span>
                      </button>
                      <span className="hidden shrink-0 text-sm tabular-nums sm:block">
                        {priceLabel ? priceLabel(p) : ""}
                      </span>
                      <Input
                        className="h-8 w-16 shrink-0 tabular-nums"
                        inputMode="decimal"
                        aria-label={`Quantity for ${p.name}`}
                        value={qtyById[p.id] ?? "1"}
                        onChange={(e) =>
                          setQtyById((prev) => ({ ...prev, [p.id]: e.target.value.replace(/[^\d.]/g, "") }))
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      {onOrder ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 px-2 text-xs"
                          onClick={() => addOne(p, true)}
                        >
                          Add as new line
                        </Button>
                      ) : (
                        <span className="w-[7.5rem] shrink-0 text-right text-xs text-muted-foreground">
                          {justAdded ? "Added" : ""}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {loadingMore ? (
              <p className="px-3 py-2 text-center text-xs text-muted-foreground">Loading more…</p>
            ) : null}
            {!loading && !loadingMore && hasMore && debouncedSearch ? (
              <div className="p-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (cursor == null) return;
                    void loadPage({ reset: false, cursor, search: debouncedSearch });
                  }}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedCount === 0 ? "Click a row to add it" : `${selectedCount} selected`}
              {selectedCount > 0 ? (
                <button
                  type="button"
                  className="ml-2 underline underline-offset-2 hover:text-foreground"
                  onClick={() => setSelected(new Map())}
                >
                  Clear
                </button>
              ) : null}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button type="button" disabled={selectedCount === 0} onClick={addSelected}>
                Add {selectedCount > 0 ? `${selectedCount} ` : ""}
                {selectedCount === 1 ? "line" : "lines"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
