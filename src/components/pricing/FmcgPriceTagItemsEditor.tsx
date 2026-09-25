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
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
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
  categoryPathLabel,
  fetchProductCategoriesApi,
  sortCategoriesForTree,
  type ItemCategoryRow,
} from "@/lib/api/product-categories";
import {
  discountFromPriceAndFinal,
  finalFromPriceAndDiscount,
  formatPriceAmount,
  normalizeDiscountInput,
  parseDiscountPercent,
  parseNumber,
} from "@/lib/pricing/price-tag-math";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const PAGE_SIZE = 25;
const SIZE_FILTERS = ["25kg", "10kg", "5kg", "1kg", "500g", "250g", "100g", "50g"] as const;
type ProductSortField = "name" | "sku" | "barcode" | "size";
type SortField = ProductSortField | "price" | "rrp" | "discount" | "final";
const PRODUCT_SORT = new Set<SortField>(["name", "sku", "barcode", "size"]);

type RowDraft = {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  size: string;
  stock: string;
  pricePerPiece: string;
  rrp: string;
  discountPercent: string;
  finalPrice: string;
};

function SortableHead({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  sortBy: SortField;
  sortDir: "asc" | "desc";
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sortBy === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(field)}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <Icons.ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <Icons.ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <Icons.ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

type EditDraft = {
  pricePerPiece: string;
  rrp: string;
  discountPercent: string;
  finalPrice: string;
};

function finalFromDraft(priceStr: string, discountStr: string): string {
  const price = parseNumber(priceStr);
  if (price == null || priceStr.trim() === "") return "";
  const discount = parseDiscountPercent(discountStr) ?? 0;
  return formatPriceAmount(finalFromPriceAndDiscount(price, discount));
}

function itemToEdit(item?: { price?: number; rrp?: number; discountPercent?: number }): EditDraft {
  const pricePerPiece = item?.price != null ? String(item.price) : "";
  const rrp = item?.rrp != null ? String(item.rrp) : "";
  const discountPercent =
    item?.discountPercent != null && item.discountPercent > 0
      ? String(item.discountPercent)
      : "";
  return {
    pricePerPiece,
    rrp,
    discountPercent,
    finalPrice: finalFromDraft(pricePerPiece, discountPercent),
  };
}

export type PriceTagViewScope = {
  search: string;
  categoryId: string;
  size: string;
  pricedStatus: "all" | "priced" | "unpriced";
};

export function FmcgPriceTagItemsEditor({
  priceListId,
  tagName,
  onSaved,
  onViewChange,
}: {
  priceListId: string;
  tagName?: string;
  onSaved?: () => void;
  onViewChange?: (scope: PriceTagViewScope) => void;
}) {
  const [list, setList] = React.useState<PriceListDetail | null>(null);
  const [listReady, setListReady] = React.useState(false);
  const [rows, setRows] = React.useState<RowDraft[]>([]);
  /** Local edits keyed by productId — survive search / page changes. */
  const [edits, setEdits] = React.useState<Record<string, EditDraft>>({});
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [sizeFilter, setSizeFilter] = React.useState("");
  const [pricedStatus, setPricedStatus] = React.useState<"all" | "priced" | "unpriced">("priced");
  const [sortBy, setSortBy] = React.useState<SortField>("name");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [categories, setCategories] = React.useState<ItemCategoryRow[]>([]);
  const [cursor, setCursor] = React.useState("0");
  const [cursorStack, setCursorStack] = React.useState<string[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [softLoading, setSoftLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);
  const requestId = React.useRef(0);
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
  }, [debouncedSearch, priceListId, categoryId, sizeFilter, pricedStatus, sortBy, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir(field === "price" || field === "rrp" || field === "final" ? "desc" : "asc");
  };

  React.useEffect(() => {
    void fetchProductCategoriesApi()
      .then((list) => setCategories(sortCategoriesForTree(list.filter((c) => c.isActive !== false))))
      .catch(() => setCategories([]));
  }, []);

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
      const request = ++requestId.current;
      if (!soft) {
        setInitialLoading(true);
      } else {
        setSoftLoading(true);
      }
      try {
        const sourceList = opts?.priceList ?? listRef.current;
        const searchQ = opts?.search ?? debouncedSearch;
        const pageCursor = opts?.cursor ?? cursor;
        const priceSort = !PRODUCT_SORT.has(sortBy);
        let pageItems: Awaited<ReturnType<typeof fetchProductsPageApi>>["items"] = [];
        let pageNext: string | null = null;
        let pageMore = false;

        if (priceSort && sourceList && !searchQ.trim() && !categoryId && !sizeFilter) {
          const key = (item: { price?: number; rrp?: number; discountPercent?: number }) => {
            if (sortBy === "rrp") return item.rrp ?? 0;
            if (sortBy === "discount") return item.discountPercent ?? 0;
            if (sortBy === "final") {
              const price = item.price ?? 0;
              const disc = item.discountPercent ?? 0;
              return finalFromPriceAndDiscount(price, disc);
            }
            return item.price ?? 0;
          };
          const sorted = [...(sourceList.items ?? [])]
            .filter((i) => pricedStatus === "unpriced" ? !(i.price > 0) : pricedStatus === "priced" ? i.price > 0 : true)
            .sort((a, b) => {
              const cmp = key(a) - key(b);
              return sortDir === "asc" ? cmp : -cmp;
            });
          const offset = Number(pageCursor) || 0;
          const slice = sorted.slice(offset, offset + PAGE_SIZE);
          const fetched = slice.length
            ? await fetchProductsPageApi({
                ids: slice.map((i) => i.productId),
                sellable: true,
                status: "ACTIVE",
                limit: PAGE_SIZE,
                includeStock: true,
              })
            : { items: [], nextCursor: null, hasMore: false };
          const order = new Map(slice.map((i, idx) => [i.productId, idx]));
          pageItems = [...fetched.items].sort(
            (a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99)
          );
          pageMore = offset + PAGE_SIZE < sorted.length;
          pageNext = pageMore ? String(offset + PAGE_SIZE) : null;
        } else {
          const page = await fetchProductsPageApi({
            sellable: true,
            status: "ACTIVE",
            search: searchQ || undefined,
            categoryId: categoryId || undefined,
            size: sizeFilter || undefined,
            pricedOnPriceListId: pricedStatus !== "all" ? priceListId : undefined,
            pricedStatus: pricedStatus !== "all" ? pricedStatus : undefined,
            sortBy: PRODUCT_SORT.has(sortBy) ? (sortBy as ProductSortField) : "name",
            sortDir,
            limit: PAGE_SIZE,
            cursor: pageCursor,
            includeStock: true,
          });
          pageItems = page.items;
          pageNext = page.nextCursor;
          pageMore = page.hasMore;
          if (priceSort) {
            const byId = new Map((sourceList?.items ?? []).map((i) => [i.productId, i]));
            pageItems = [...pageItems].sort((a, b) => {
              const ea = editsRef.current[a.id] ?? itemToEdit(byId.get(a.id));
              const eb = editsRef.current[b.id] ?? itemToEdit(byId.get(b.id));
              const num = (row: EditDraft) => {
                if (sortBy === "rrp") return parseNumber(row.rrp) ?? 0;
                if (sortBy === "discount") return parseDiscountPercent(row.discountPercent) ?? 0;
                if (sortBy === "final") return parseNumber(row.finalPrice) ?? 0;
                return parseNumber(row.pricePerPiece) ?? 0;
              };
              const cmp = num(ea) - num(eb);
              return sortDir === "asc" ? cmp : -cmp;
            });
          }
        }

        const byId = new Map((sourceList?.items ?? []).map((i) => [i.productId, i]));
        const currentEdits = editsRef.current;
        const drafts: RowDraft[] = pageItems.map((p) => {
          const edit = currentEdits[p.id] ?? itemToEdit(byId.get(p.id));
          const stock =
            typeof p.currentStock === "number"
              ? String(p.currentStock)
              : typeof p.availableQuantity === "number"
                ? String(p.availableQuantity)
                : "—";
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode?.trim() || "—",
            size: p.size?.trim() || "—",
            stock,
            pricePerPiece: edit.pricePerPiece,
            rrp: edit.rrp,
            discountPercent: edit.discountPercent,
            finalPrice: edit.finalPrice || finalFromDraft(edit.pricePerPiece, edit.discountPercent),
          };
        });
        if (request !== requestId.current) return;
        setRows(drafts);
        setNextCursor(pageNext);
        setHasMore(pageMore);
        hasLoadedOnce.current = true;
        setListReady(true);
      } catch (e) {
        if (request !== requestId.current) return;
        toast.error(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        if (request === requestId.current) {
          setInitialLoading(false);
          setSoftLoading(false);
        }
      }
    },
    [debouncedSearch, cursor, categoryId, sizeFilter, pricedStatus, sortBy, sortDir, priceListId]
  );

  // Tag switch / first open — soft progress only; never blank the sidebar/selection.
  React.useEffect(() => {
    let cancelled = false;
    const switching = hasLoadedOnce.current;
    setEdits({});
    setSearch("");
    setDebouncedSearch("");
    setCategoryId("");
    setSizeFilter("");
    setPricedStatus("priced");
    setSortBy("name");
    setSortDir("asc");
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

  // Skip only the first mount. A later flag that stayed true was swallowing the
  // first search/filter after a tag opened, so the grid kept the previous page.
  const skipSearchEffect = React.useRef(true);
  React.useEffect(() => {
    if (skipSearchEffect.current) {
      skipSearchEffect.current = false;
      return;
    }
    if (!hasLoadedOnce.current) return;
    void loadProductsPage({ soft: true });
  }, [debouncedSearch, cursor, categoryId, sizeFilter, pricedStatus, sortBy, sortDir, loadProductsPage]);

  React.useEffect(() => {
    onViewChange?.({
      search: debouncedSearch.trim(),
      categoryId,
      size: sizeFilter,
      pricedStatus,
    });
  }, [debouncedSearch, categoryId, sizeFilter, pricedStatus, onViewChange]);

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

  const editPrice = (productId: string, pricePerPiece: string) => {
    const current =
      edits[productId] ??
      itemToEdit(list?.items.find((i) => i.productId === productId));
    setRowEdit(productId, {
      pricePerPiece,
      finalPrice: finalFromDraft(pricePerPiece, current.discountPercent),
    });
  };

  const editDiscount = (productId: string, discountPercent: string) => {
    const current =
      edits[productId] ??
      itemToEdit(list?.items.find((i) => i.productId === productId));
    setRowEdit(productId, {
      discountPercent,
      finalPrice: finalFromDraft(current.pricePerPiece, discountPercent),
    });
  };

  const commitDiscount = (productId: string, discountPercent: string) => {
    const normalized = normalizeDiscountInput(discountPercent);
    if (normalized === discountPercent) return;
    editDiscount(productId, normalized);
  };

  const editFinal = (productId: string, finalPrice: string) => {
    const current =
      edits[productId] ??
      itemToEdit(list?.items.find((i) => i.productId === productId));
    const price = parseNumber(current.pricePerPiece);
    if (finalPrice.trim() === "") {
      setRowEdit(productId, { discountPercent: "", finalPrice: "" });
      return;
    }
    if (price == null || price <= 0) {
      setRowEdit(productId, { finalPrice });
      return;
    }
    const final = parseNumber(finalPrice);
    if (final == null) {
      setRowEdit(productId, { finalPrice });
      return;
    }
    const discount = discountFromPriceAndFinal(price, final);
    setRowEdit(productId, {
      finalPrice,
      discountPercent: discount != null && discount > 0 ? formatPriceAmount(discount) : "",
    });
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
        const discountPercent = parseDiscountPercent(edit.discountPercent);
        const rrp = Number(edit.rrp);
        byId.set(productId, {
          productId,
          price,
          ...(Number.isFinite(rrp) && rrp > 0 && edit.rrp.trim() !== "" ? { rrp } : {}),
          ...(discountPercent != null && discountPercent > 0 ? { discountPercent } : {}),
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
        const discountPercent = parseDiscountPercent(r.discountPercent);
        const rrp = Number(r.rrp);
        byId.set(r.productId, {
          productId: r.productId,
          price,
          ...(Number.isFinite(rrp) && rrp > 0 && r.rrp.trim() !== "" ? { rrp } : {}),
          ...(discountPercent != null && discountPercent > 0 ? { discountPercent } : {}),
        });
      }

      const items = [...byId.values()].map((i) => ({
        productId: i.productId,
        price: i.price,
        ...(i.rrp != null && i.rrp > 0 ? { rrp: i.rrp } : {}),
        ...(i.discountPercent != null && i.discountPercent > 0
          ? { discountPercent: i.discountPercent }
          : {}),
      }));

      const saved = await updatePriceListApi(list.id, { items });
      const sfa = saved?.sfaSync;
      const target = sfa?.target ? ` ${sfa.target}` : " SFA";
      const skippedNote =
        sfa && sfa.skipped > 0 ? ` (${sfa.skipped} skipped)` : "";
      if (sfa?.attempted && sfa.pushed > 0) {
        toast.success(
          `Price tag saved. Pushed ${sfa.pushed} price${sfa.pushed === 1 ? "" : "s"} to${target}${skippedNote}`
        );
      } else if (sfa?.attempted && sfa.reason) {
        toast.error(`Price tag saved, but SFA push failed: ${sfa.reason}`);
      } else if (sfa && !sfa.attempted) {
        toast.success(
          `Price tag saved. ${sfa.reason ?? "SFA was not updated."}`
        );
      } else {
        toast.success("Price tag saved (prices are per piece)");
      }
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
  const hasFilters = Boolean(debouncedSearch.trim() || categoryId || sizeFilter || pricedStatus !== "all");
  const showEmptyCatalog =
    rows.length === 0 && !hasFilters && !softLoading;
  const showEmptySearch =
    rows.length === 0 && hasFilters && !softLoading;
  const tagLabel = list?.name ?? tagName ?? "this tag";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enter <span className="font-medium text-foreground">sell price per piece</span> and
        optional <span className="font-medium text-foreground">RRP</span> for{" "}
        <span className="font-medium text-foreground">{tagLabel}</span>. Sell is what you
        charge; RRP is the recommended reseller price. Discount % and final price stay
        in sync. To add prices for SKUs that are still blank, set Price to{" "}
        <span className="font-medium text-foreground">No price yet</span>, download this
        view, fill the sheet, and import it. Import updates only the rows in the file.
      </p>

      <DataTableToolbar
        searchPlaceholder="Search products by name, SKU, or barcode…"
        searchValue={search}
        onSearchChange={setSearch}
        searchInputProps={{ disabled: softLoading && rows.length === 0 }}
        filters={[
          {
            id: "priced",
            label: "Price",
            options: [
              { label: "All SKUs", value: "all" },
              { label: "Has a price", value: "priced" },
              { label: "No price yet", value: "unpriced" },
            ],
            value: pricedStatus,
            onChange: (v) => setPricedStatus((v || "all") as "all" | "priced" | "unpriced"),
          },
          {
            id: "size",
            label: "Size",
            options: [
              { label: "All sizes", value: "" },
              ...SIZE_FILTERS.map((s) => ({ label: s, value: s })),
            ],
            value: sizeFilter,
            onChange: setSizeFilter,
          },
          {
            id: "category",
            label: "Category",
            options: [
              { label: "All categories", value: "" },
              ...categories.map((c) => ({ label: categoryPathLabel(c, categories), value: c.id })),
            ],
            value: categoryId,
            onChange: setCategoryId,
          },
        ]}
        activeFiltersCount={
          (pricedStatus !== "all" ? 1 : 0) + (sizeFilter ? 1 : 0) + (categoryId ? 1 : 0)
        }
        onClearFilters={() => {
          setPricedStatus("priced");
          setSizeFilter("");
          setCategoryId("");
          setSearch("");
        }}
      />

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
                    <SortableHead label="Product" field="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortableHead label="Barcode" field="barcode" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortableHead label="Size" field="size" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="w-[88px]" />
                    <SortableHead label="SKU" field="sku" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <TableHead className="w-[88px]">Stock</TableHead>
                    <SortableHead label="Sell / pc" field="price" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="w-[140px]" />
                    <SortableHead label="RRP / pc" field="rrp" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="w-[140px]" />
                    <SortableHead label="Discount %" field="discount" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="w-[120px]" />
                    <SortableHead label="Final price" field="final" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="w-[140px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showEmptySearch ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        {pricedStatus === "priced"
                          ? "No SKUs with a price match. Choose “No price yet” to list products still missing a price on this tag."
                          : pricedStatus === "unpriced"
                            ? "Every matching SKU already has a price on this tag."
                            : "No products match these filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.productId}>
                        <TableCell className="text-sm">{r.name}</TableCell>
                        <TableCell className="font-mono text-xs">{r.barcode}</TableCell>
                        <TableCell className="text-sm tabular-nums">{r.size}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{r.sku}</TableCell>
                        <TableCell className="text-sm tabular-nums">{r.stock}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8"
                            value={r.pricePerPiece}
                            onChange={(e) => editPrice(r.productId, e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8"
                            value={r.rrp}
                            onChange={(e) => setRowEdit(r.productId, { rrp: e.target.value })}
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
                            onChange={(e) => editDiscount(r.productId, e.target.value)}
                            onBlur={(e) => commitDiscount(r.productId, e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-8"
                            value={r.finalPrice}
                            onChange={(e) => editFinal(r.productId, e.target.value)}
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
