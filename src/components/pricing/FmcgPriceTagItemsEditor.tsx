"use client";

/**
 * FMCG-only: edit price-tag rows as price-per-piece + optional discount %.
 * CoolCatch / seafood must not mount this — they keep daily pricing UI.
 *
 * Product grid uses backend search + cursor pagination. Soft-loads with a
 * linear progress bar so current rows stay visible until the next page returns.
 */

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPriceListByIdApi,
  updatePriceListApi,
  type PriceListDetail,
} from "@/lib/api/pricing";
import { fetchProductsPageApi } from "@/lib/api/products";
import {
  downloadImportTemplateApi,
  importPriceListsApi,
} from "@/lib/api/import-export";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const PAGE_SIZE = 25;

type RowDraft = {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  size: string;
  pricePerPiece: string;
  discountPercent: string;
};

type EditDraft = {
  pricePerPiece: string;
  discountPercent: string;
};

function itemToEdit(item?: { price?: number; discountPercent?: number }): EditDraft {
  return {
    pricePerPiece: item?.price != null ? String(item.price) : "",
    discountPercent:
      item?.discountPercent != null && item.discountPercent > 0
        ? String(item.discountPercent)
        : "",
  };
}

export function FmcgPriceTagItemsEditor({
  priceListId,
  onSaved,
}: {
  priceListId: string;
  onSaved?: () => void;
}) {
  const [list, setList] = React.useState<PriceListDetail | null>(null);
  const [listReady, setListReady] = React.useState(false);
  const [rows, setRows] = React.useState<RowDraft[]>([]);
  /** Local edits keyed by productId — survive search / page changes. */
  const [edits, setEdits] = React.useState<Record<string, EditDraft>>({});
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [cursor, setCursor] = React.useState("0");
  const [cursorStack, setCursorStack] = React.useState<string[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [softLoading, setSoftLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const hasLoadedOnce = React.useRef(false);
  const editsRef = React.useRef(edits);
  editsRef.current = edits;
  const listRef = React.useRef(list);
  listRef.current = list;

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  React.useEffect(() => {
    setCursor("0");
    setCursorStack([]);
    setNextCursor(null);
  }, [debouncedSearch, priceListId]);

  const loadPriceList = React.useCallback(async () => {
    try {
      const detail = await fetchPriceListByIdApi(priceListId);
      if (!detail) {
        toast.error("Price tag not found");
        setList(null);
        setListReady(true);
        return null;
      }
      setList(detail);
      setListReady(true);
      return detail;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load price tag");
      setList(null);
      setListReady(true);
      return null;
    }
  }, [priceListId]);

  const loadProductsPage = React.useCallback(
    async (opts?: {
      priceList?: PriceListDetail | null;
      soft?: boolean;
      search?: string;
      cursor?: string;
    }) => {
      const soft = opts?.soft ?? hasLoadedOnce.current;
      if (!soft) {
        setInitialLoading(true);
      } else {
        setSoftLoading(true);
      }
      try {
        const page = await fetchProductsPageApi({
          sellable: true,
          status: "ACTIVE",
          search: (opts?.search ?? debouncedSearch) || undefined,
          limit: PAGE_SIZE,
          cursor: opts?.cursor ?? cursor,
          includeStock: false,
        });
        const sourceList = opts?.priceList ?? listRef.current;
        const byId = new Map((sourceList?.items ?? []).map((i) => [i.productId, i]));
        const currentEdits = editsRef.current;
        const drafts: RowDraft[] = page.items.map((p) => {
          const edit = currentEdits[p.id] ?? itemToEdit(byId.get(p.id));
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode?.trim() || "—",
            size: p.size?.trim() || "—",
            pricePerPiece: edit.pricePerPiece,
            discountPercent: edit.discountPercent,
          };
        });
        setRows(drafts);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
        setListReady(true);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        setInitialLoading(false);
        setSoftLoading(false);
      }
    },
    [debouncedSearch, cursor]
  );

  // Tag switch / first open — soft progress only; never blank the sidebar/selection.
  React.useEffect(() => {
    let cancelled = false;
    const switching = hasLoadedOnce.current;
    setEdits({});
    setSearch("");
    setDebouncedSearch("");
    setCursor("0");
    setCursorStack([]);
    setNextCursor(null);
    if (switching) setSoftLoading(true);
    else setInitialLoading(true);

    void (async () => {
      const detail = await loadPriceList();
      if (cancelled) return;
      await loadProductsPage({
        priceList: detail,
        soft: switching,
        search: "",
        cursor: "0",
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tag change only
  }, [priceListId]);

  // Search / page changes (not tag switch — that path passes explicit search/cursor).
  const skipSearchEffect = React.useRef(true);
  React.useEffect(() => {
    // Skip the mount + the reset that follows a tag switch.
    if (skipSearchEffect.current) {
      skipSearchEffect.current = false;
      return;
    }
    if (!hasLoadedOnce.current) return;
    void loadProductsPage({ soft: true });
  }, [debouncedSearch, cursor, loadProductsPage]);

  React.useEffect(() => {
    // After a tag switch resets search/cursor, ignore the next search-effect tick.
    skipSearchEffect.current = true;
  }, [priceListId]);

  const setRowEdit = (productId: string, patch: Partial<EditDraft>) => {
    setEdits((prev) => {
      const current =
        prev[productId] ??
        itemToEdit(list?.items.find((i) => i.productId === productId));
      const next = { ...current, ...patch };
      return { ...prev, [productId]: next };
    });
    setRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, ...patch } : r))
    );
  };

  const save = async () => {
    if (!list) return;
    setSaving(true);
    try {
      const byId = new Map(list.items.map((i) => [i.productId, { ...i }]));
      for (const [productId, edit] of Object.entries(edits)) {
        const price = Number(edit.pricePerPiece);
        if (!Number.isFinite(price) || price < 0 || edit.pricePerPiece.trim() === "") {
          byId.delete(productId);
          continue;
        }
        const discountPercent = Number(edit.discountPercent);
        byId.set(productId, {
          productId,
          price,
          ...(Number.isFinite(discountPercent) && discountPercent > 0
            ? { discountPercent }
            : {}),
        });
      }

      // Also merge visible rows that may not have been keyed yet (typed then not via setRowEdit path)
      for (const r of rows) {
        if (edits[r.productId]) continue;
        const price = Number(r.pricePerPiece);
        if (!Number.isFinite(price) || price < 0 || r.pricePerPiece.trim() === "") {
          // leave existing list item as-is if user didn't touch
          continue;
        }
        const discountPercent = Number(r.discountPercent);
        byId.set(r.productId, {
          productId: r.productId,
          price,
          ...(Number.isFinite(discountPercent) && discountPercent > 0
            ? { discountPercent }
            : {}),
        });
      }

      const items = [...byId.values()].map((i) => ({
        productId: i.productId,
        price: i.price,
        ...(i.discountPercent != null && i.discountPercent > 0
          ? { discountPercent: i.discountPercent }
          : {}),
      }));

      await updatePriceListApi(list.id, { items });
      toast.success("Price tag saved (prices are per piece)");
      setEdits({});
      onSaved?.();
      await loadPriceList();
      await loadProductsPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const showFirstLoad = initialLoading && !hasLoadedOnce.current && rows.length === 0;

  if (showFirstLoad) {
    return (
      <div className="relative space-y-3 py-2">
        <TopProgressBar active />
        <p className="text-sm text-muted-foreground">Loading products…</p>
      </div>
    );
  }

  if (listReady && !list && !softLoading) {
    return (
      <p className="text-sm text-muted-foreground py-6">Price tag not found.</p>
    );
  }

  const pageNumber = cursorStack.length + 1;
  const showEmptyCatalog =
    rows.length === 0 && !debouncedSearch.trim() && !softLoading;
  const showEmptySearch =
    rows.length === 0 && Boolean(debouncedSearch.trim()) && !softLoading;
  const tagLabel = list?.name ?? "this tag";

  const handleCsvImport = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await importPriceListsApi(file);
      const skipped = result.skipped?.length ?? 0;
      toast.success(
        `Imported prices: ${result.pricesUpserted} row(s), ${result.tagsCreated} tag(s) created, ${result.tagsUpdated} updated` +
          (skipped ? ` · ${skipped} skipped` : "")
      );
      onSaved?.();
      await loadPriceList();
      await loadProductsPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Price CSV import failed");
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enter <span className="font-medium text-foreground">price per piece</span> for{" "}
        <span className="font-medium text-foreground">{tagLabel}</span> in the grid
        below. Optional discount % can show on the customer invoice.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          className="hidden"
          onChange={(e) => void handleCsvImport(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={importing}
          onClick={() => csvInputRef.current?.click()}
        >
          <Icons.Upload className="mr-1.5 h-3.5 w-3.5" />
          {importing ? "Importing…" : "Import CSV"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            downloadImportTemplateApi("price-lists", (msg) => toast.info(msg || "Template unavailable."))
          }
        >
          <Icons.Download className="mr-1.5 h-3.5 w-3.5" />
          CSV template
        </Button>
        <span className="text-xs text-muted-foreground">
          Columns: priceTag, sku or barcode, price, discountPercent (optional)
        </span>
      </div>

      <div className="relative">
        <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, SKU, or barcode…"
          className="pl-8"
          disabled={softLoading && rows.length === 0}
        />
      </div>

      {showEmptyCatalog ? (
        <div className="rounded-md border border-dashed px-6 py-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No products to price yet. Add SKUs under{" "}
            <span className="font-medium text-foreground">Masters → Products</span>, then return
            here.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" asChild>
              <Link href="/master/products">Go to Products</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/master/products?import=1">Bulk import</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-md border">
            <TopProgressBar active={softLoading || initialLoading} />
            <div
              className={
                softLoading
                  ? "max-h-[420px] overflow-auto opacity-60 transition-opacity"
                  : "max-h-[420px] overflow-auto transition-opacity"
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead className="w-[88px]">Size</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="w-[140px]">Price / pc</TableHead>
                    <TableHead className="w-[120px]">Discount %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showEmptySearch ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No products match “{debouncedSearch.trim()}”.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.productId}>
                        <TableCell className="text-sm">{r.name}</TableCell>
                        <TableCell className="font-mono text-xs">{r.barcode}</TableCell>
                        <TableCell className="text-sm tabular-nums">{r.size}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{r.sku}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8"
                            value={r.pricePerPiece}
                            onChange={(e) =>
                              setRowEdit(r.productId, { pricePerPiece: e.target.value })
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            className="h-8"
                            value={r.discountPercent}
                            onChange={(e) =>
                              setRowEdit(r.productId, { discountPercent: e.target.value })
                            }
                            placeholder="0"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Page {pageNumber}
              {rows.length > 0 ? ` · ${rows.length} on this page` : ""}
              {Object.keys(edits).length > 0
                ? ` · ${Object.keys(edits).length} unsaved edit${Object.keys(edits).length === 1 ? "" : "s"}`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={softLoading || cursorStack.length === 0}
                onClick={() => {
                  const stack = [...cursorStack];
                  const prev = stack.pop() ?? "0";
                  setCursorStack(stack);
                  setCursor(prev);
                }}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={softLoading || !hasMore || !nextCursor}
                onClick={() => {
                  if (!nextCursor) return;
                  setCursorStack((s) => [...s, cursor]);
                  setCursor(nextCursor);
                }}
              >
                Next
              </Button>
              <Button onClick={() => void save()} disabled={saving || softLoading}>
                {saving ? "Saving…" : "Save piece prices"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
