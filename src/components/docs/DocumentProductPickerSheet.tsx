"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchProductsPageApi } from "@/lib/api/products";
import type { ProductRow } from "@/lib/types/masters";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentProductPickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** purchasable | sellable | all — matches document line filter. */
  productFilter?: "purchasable" | "sellable" | "all";
  fmcgOrg?: boolean;
  /** Already on the document — still selectable to add another line of the same SKU. */
  existingProductIds?: string[];
  onConfirm: (products: ProductRow[]) => void;
};

const PAGE_SIZE = 40;

export function DocumentProductPickerSheet({
  open,
  onOpenChange,
  productFilter = "sellable",
  fmcgOrg = false,
  onConfirm,
}: DocumentProductPickerSheetProps) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [items, setItems] = React.useState<ProductRow[]>([]);
  const [cursor, setCursor] = React.useState<string | null>("0");
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [selected, setSelected] = React.useState<Map<string, ProductRow>>(new Map());
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const loadGen = React.useRef(0);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebouncedSearch("");
    setSelected(new Map());
    setItems([]);
    setCursor("0");
    setHasMore(false);
  }, [open]);

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
          limit: PAGE_SIZE,
          cursor: opts.cursor ?? "0",
          includeStock: false,
        });
        if (gen !== loadGen.current) return;
        setItems((prev) => (opts.reset ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (e) {
        if (gen !== loadGen.current) return;
        toast.error(e instanceof Error ? e.message : "Failed to load products.");
        if (opts.reset) {
          setItems([]);
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
    [productFilter]
  );

  React.useEffect(() => {
    if (!open) return;
    void loadPage({ reset: true, cursor: "0", search: debouncedSearch });
  }, [open, debouncedSearch, loadPage]);

  const toggle = (product: ProductRow) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.set(product.id, product);
      return next;
    });
  };

  const selectedCount = selected.size;

  const handleConfirm = () => {
    if (selectedCount === 0) {
      toast.error("Select at least one product.");
      return;
    }
    onConfirm([...selected.values()]);
    onOpenChange(false);
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingMore || loading) return;
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 80) return;
    if (cursor == null) return;
    void loadPage({ reset: false, cursor, search: debouncedSearch });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add products</SheetTitle>
          <SheetDescription>
            Search and check the SKUs to add as lines
            {fmcgOrg ? " (qty and pack UOM can be set after)." : "."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Icons.Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, SKU, barcode…"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {selectedCount === 0
                ? "None selected"
                : `${selectedCount} selected`}
            </span>
            {selectedCount > 0 ? (
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setSelected(new Map())}
              >
                Clear
              </button>
            ) : null}
          </div>

          <div
            ref={listRef}
            onScroll={onScroll}
            className="flex-1 min-h-[16rem] max-h-[min(60vh,28rem)] overflow-y-auto rounded-md border"
          >
            {loading && items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Loading products…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No products match{debouncedSearch ? ` “${debouncedSearch}”` : ""}.
              </p>
            ) : (
              <ul className="divide-y">
                {items.map((p) => {
                  const checked = selected.has(p.id);
                  const meta = [
                    p.sku,
                    fmcgOrg
                      ? (p.categoryName ?? p.category)?.trim()
                      : p.productFamily?.trim(),
                    p.size?.trim(),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={p.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/50",
                          checked && "bg-primary/5"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(p)}
                          className="mt-0.5"
                          aria-label={`Select ${p.sku}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-snug">{p.name}</span>
                          <span className="block text-xs text-muted-foreground font-mono mt-0.5">
                            {meta || p.id}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {loadingMore ? (
              <p className="px-3 py-2 text-xs text-muted-foreground text-center">Loading more…</p>
            ) : null}
            {!loading && !loadingMore && hasMore ? (
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
        </div>

        <SheetFooter className="mt-4 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={selectedCount === 0} onClick={handleConfirm}>
            Add {selectedCount > 0 ? `${selectedCount} ` : ""}
            {selectedCount === 1 ? "line" : "lines"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
