"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { SkeletonDataTable } from "@/components/ui/skeleton";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { TablePagination } from "@/components/ui/table-pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  fetchProductsPageApi,
  deleteProductApi,
} from "@/lib/api/products";
import { fetchProductCategoriesApi, type ItemCategoryRow } from "@/lib/api/product-categories";
import {
  fetchLatestInventoryCosting,
  fetchProductCostLayers,
  type InventoryCostingSnapshot,
  type ProductCostLayersResponse,
} from "@/lib/api/inventory-costing";
import type { ProductKind } from "@/lib/products/product-type";
import { productTypeSortKey } from "@/lib/products/product-type";
import { ProductTypeBadge } from "@/components/products/ProductTypeBadge";
import { useAuthStore } from "@/stores/auth-store";
import { formatMoney } from "@/lib/money";
import { downloadCsv } from "@/lib/export/csv";
import { formatDate, cn } from "@/lib/utils";
import type { FilterChip } from "@/components/ui/filter-chips";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const SEARCH_DEBOUNCE_MS = 400;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const LOW_STOCK_THRESHOLD = 20;

type StockFilter = "all" | "ACTIVE" | "low" | "out";

interface Product {
  id: string;
  name: string;
  sku: string;
  productFamily?: string;
  productType?: ProductKind;
  category: string;
  stock: number;
  avgInventoryCost?: number | null;
  status: string;
  lastUpdated: string;
}

function weightedAvgBookCostByProduct(costing: InventoryCostingSnapshot | null): Map<string, number> {
  const result = new Map<string, number>();
  if (!costing?.items?.length) return result;
  const agg = new Map<string, { q: number; v: number }>();
  for (const item of costing.items) {
    const q = item.quantity ?? 0;
    if (q <= 0) continue;
    const cur = agg.get(item.productId) ?? { q: 0, v: 0 };
    cur.q += q;
    cur.v += item.inventoryValue ?? 0;
    agg.set(item.productId, cur);
  }
  for (const [pid, { q, v }] of agg) {
    if (q > 0) result.set(pid, v / q);
  }
  return result;
}

function StockLevelCell({ stock }: { stock: number }) {
  const tone =
    stock <= 0 ? "text-red-600 dark:text-red-400" : stock < LOW_STOCK_THRESHOLD ? "text-amber-600 dark:text-amber-400" : "";
  const barPct =
    stock <= 0 ? 0 : Math.min(100, Math.round((stock / LOW_STOCK_THRESHOLD) * 100));
  const barTone =
    stock <= 0 ? "bg-red-500" : stock < LOW_STOCK_THRESHOLD ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="text-right min-w-[4.5rem]">
      <div className={cn("font-semibold tabular-nums", tone)}>{stock.toLocaleString()}</div>
      {stock > 0 && stock < LOW_STOCK_THRESHOLD ? (
        <div className="text-[10px] text-amber-600 dark:text-amber-400">Low stock</div>
      ) : null}
      {stock <= 0 ? <div className="text-[10px] text-red-600 dark:text-red-400">Out of stock</div> : null}
      <div className="mt-1 ml-auto max-w-[4.5rem] h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barTone)} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canDelete = permissions.includes("admin.settings");

  const [searchInput, setSearchInput] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StockFilter>("all");
  const [productTypeFilter, setProductTypeFilter] = React.useState<"all" | ProductKind>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  const [rows, setRows] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<ItemCategoryRow[]>([]);
  const [avgCostMap, setAvgCostMap] = React.useState<Map<string, number>>(new Map());
  const avgCostMapRef = React.useRef(avgCostMap);
  avgCostMapRef.current = avgCostMap;
  const [costingRanAt, setCostingRanAt] = React.useState<string | null>(null);

  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(25);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  const [batchSheetProductId, setBatchSheetProductId] = React.useState<string | null>(null);
  const [layersPayload, setLayersPayload] = React.useState<ProductCostLayersResponse | null>(null);
  const [layersLoading, setLayersLoading] = React.useState(false);

  const categoryNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  React.useEffect(() => {
    void Promise.all([
      fetchProductCategoriesApi().catch(() => [] as ItemCategoryRow[]),
      fetchLatestInventoryCosting().catch(() => null),
    ])
      .then(([cats, costing]) => {
        setCategories(cats);
        setAvgCostMap(weightedAvgBookCostByProduct(costing));
        setCostingRanAt(costing?.ranAt ?? null);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load product settings.");
      });
  }, []);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchProductsPageApi({
          limit: pageSize,
          cursor: String(offset),
          search: debouncedSearch || undefined,
          status: statusFilter === "ACTIVE" ? "ACTIVE" : undefined,
          stockBand:
            statusFilter === "low" ? "low" : statusFilter === "out" ? "out" : undefined,
          productType: productTypeFilter !== "all" ? productTypeFilter : undefined,
          categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
          includeStock: true,
        });
        setRows(
          page.items.map((row) => ({
            id: row.id,
            name: row.name,
            sku: row.sku,
            productFamily: row.productFamily,
            productType: row.productType,
            category: row.category ?? "",
            stock: row.currentStock ?? 0,
            avgInventoryCost: avgCostMapRef.current.has(row.id)
              ? avgCostMapRef.current.get(row.id)!
              : null,
            status: row.status === "ACTIVE" ? "Active" : row.status ?? "Active",
            lastUpdated: row.updatedAt ? formatDate(row.updatedAt, "short") : "—",
          })),
        );
        setPageOffset(page.offset);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load products.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [categoryFilter, debouncedSearch, pageSize, productTypeFilter, statusFilter],
  );

  React.useEffect(() => {
    if (!hasLoadedOnce.current) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        avgInventoryCost: avgCostMap.has(r.id) ? avgCostMap.get(r.id)! : null,
      })),
    );
  }, [avgCostMap]);

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  React.useEffect(() => {
    if (!batchSheetProductId) {
      setLayersPayload(null);
      return;
    }
    let cancelled = false;
    setLayersLoading(true);
    setLayersPayload(null);
    void fetchProductCostLayers(batchSheetProductId)
      .then((data) => {
        if (!cancelled) setLayersPayload(data);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load batches.");
      })
      .finally(() => {
        if (!cancelled) setLayersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [batchSheetProductId]);

  const searchPending = searchInput.trim() !== debouncedSearch.trim();
  const tableBusy = fetching || searchPending;

  const filterChips: FilterChip[] = React.useMemo(() => {
    const chips: FilterChip[] = [];
    if (statusFilter !== "all") {
      const label =
        statusFilter === "ACTIVE"
          ? "Active"
          : statusFilter === "low"
            ? "Low stock"
            : "Out of stock";
      chips.push({ id: "status", label: "Status", value: label });
    }
    if (productTypeFilter !== "all") {
      chips.push({ id: "type", label: "Type", value: productTypeFilter });
    }
    if (categoryFilter !== "all") {
      chips.push({
        id: "category",
        label: "Category",
        value: categoryNameById.get(categoryFilter) ?? categoryFilter,
      });
    }
    if (searchInput.trim()) chips.push({ id: "q", label: "Search", value: searchInput.trim() });
    return chips;
  }, [categoryFilter, categoryNameById, productTypeFilter, searchInput, statusFilter]);

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setProductTypeFilter("all");
    setCategoryFilter("all");
  };

  const goToPreviousPage = () => {
    if (pageOffset <= 0 || initialLoading || fetching) return;
    void loadPage(Math.max(0, pageOffset - pageSize));
  };

  const goToNextPage = () => {
    if (!hasMore || initialLoading || fetching) return;
    void loadPage(pageOffset + pageSize);
  };

  const refreshCurrentPage = React.useCallback(async () => {
    await loadPage(pageOffset);
  }, [loadPage, pageOffset]);

  const handleView = (id: string) => {
    router.push(`/master/products/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProductApi(id);
      toast.success("Product deleted.");
      await refreshCurrentPage();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "name",
        header: "Product Name",
        sortable: true,
        sortValue: (row: Product) => row.name.toLowerCase(),
        accessor: (row: Product) => (
          <div className="space-y-1 min-w-[10rem]">
            <div className="font-medium leading-snug">{row.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.sku}</div>
            {row.productFamily?.trim() ? (
              <div className="text-xs text-muted-foreground">{row.productFamily}</div>
            ) : null}
          </div>
        ),
        sticky: true,
      },
      {
        id: "productType",
        header: "Product type",
        sortable: true,
        sortValue: (row: Product) => productTypeSortKey(row.productType),
        accessor: (row: Product) => <ProductTypeBadge type={row.productType} />,
      },
      {
        id: "category",
        header: "Category",
        sortable: true,
        sortValue: (row: Product) =>
          (categoryNameById.get(row.category) ?? row.category ?? "").toLowerCase(),
        accessor: (row: Product) => {
          const name = categoryNameById.get(row.category) ?? row.category;
          return name ? (
            <Badge variant="secondary" className="text-xs font-normal">
              {name}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          );
        },
      },
      {
        id: "stock",
        header: "Stock",
        sortable: true,
        sortValue: (row: Product) => row.stock,
        accessor: (row: Product) => <StockLevelCell stock={row.stock} />,
      },
      {
        id: "avgCost",
        header: "Avg inventory cost",
        sortable: true,
        sortValue: (row: Product) => row.avgInventoryCost ?? -1,
        accessor: (row: Product) => {
          const v = row.avgInventoryCost;
          if (v == null || Number.isNaN(v)) {
            return <div className="text-right text-muted-foreground text-sm">—</div>;
          }
          return (
            <div className="text-right min-w-[5rem]">
              <div className="font-medium tabular-nums">{formatMoney(v, "KES")}</div>
              <div className="text-[11px] text-muted-foreground">Book avg / unit</div>
            </div>
          );
        },
      },
      {
        id: "batchDrilldown",
        header: "",
        accessor: (row: Product) =>
          row.stock > 0 ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="View cost batches"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBatchSheetProductId(row.id);
                    }}
                  >
                    <Icons.Layers className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">FIFO-style batches & average</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
        className: "w-[48px]",
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row: Product) => row.status.toLowerCase(),
        accessor: (row: Product) => <StatusBadge status={row.status} />,
      },
      {
        id: "lastUpdated",
        header: "Last updated",
        sortable: true,
        sortValue: (row: Product) => row.lastUpdated,
        accessor: (row: Product) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">{row.lastUpdated}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        accessor: (row: Product) => (
          <RowActions
            actions={[
              {
                label: "View",
                icon: "Eye",
                onClick: () => handleView(row.id),
              },
              {
                label: "Edit",
                icon: "Edit",
                onClick: () => handleView(row.id),
              },
              {
                label: "Duplicate",
                icon: "Copy",
                onClick: () => handleView(row.id),
              },
              ...(canDelete
                ? [
                    {
                      label: "Delete",
                      icon: "Trash2" as const,
                      onClick: () => void handleDelete(row.id),
                      variant: "destructive" as const,
                    },
                  ]
                : []),
            ]}
          />
        ),
        className: "w-[50px]",
      },
    ],
    [canDelete, categoryNameById],
  );

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory/products" },
          { label: "Products" },
        ]}
        showCommandHint
        actions={
          <Button onClick={() => router.push("/master/products")}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <div className={LIST_PAGE_BODY_CLASS}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 space-y-3 border-b px-4 py-4">
            <DataTableToolbar className="shrink-0 rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm"
              searchPlaceholder="Search products by name or SKU…"
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              filters={[
                {
                  id: "status",
                  label: "Status",
                  options: [
                    { label: "All", value: "all" },
                    { label: "Active", value: "ACTIVE" },
                    { label: "Low stock", value: "low" },
                    { label: "Out of stock", value: "out" },
                  ],
                  value: statusFilter,
                  onChange: (v) => setStatusFilter(v as StockFilter),
                },
                {
                  id: "productType",
                  label: "Product type",
                  options: [
                    { label: "All types", value: "all" },
                    { label: "Purchased product", value: "RAW" },
                    { label: "Finished product", value: "FINISHED" },
                    { label: "Stock product", value: "BOTH" },
                  ],
                  value: productTypeFilter,
                  onChange: (v) => setProductTypeFilter(v as "all" | ProductKind),
                },
                {
                  id: "category",
                  label: "Category",
                  options: [
                    { label: "All categories", value: "all" },
                    ...categories.map((c) => ({ label: c.name, value: c.id })),
                  ],
                  value: categoryFilter,
                  onChange: setCategoryFilter,
                },
              ]}
              activeFiltersCount={filterChips.length}
              onClearFilters={clearFilters}
              filterChips={filterChips}
              onRemoveFilterChip={(id) => {
                if (id === "status") setStatusFilter("all");
                if (id === "type") setProductTypeFilter("all");
                if (id === "category") setCategoryFilter("all");
                if (id === "q") setSearchInput("");
              }}
              onExport={() =>
                downloadCsv(
                  `products-${new Date().toISOString().slice(0, 10)}.csv`,
                  rows.map((r) => ({
                    sku: r.sku,
                    name: r.name,
                    category: categoryNameById.get(r.category) ?? r.category,
                    productType: r.productType ?? "",
                    stock: r.stock,
                    avgInventoryCost: r.avgInventoryCost ?? "",
                    status: r.status,
                    lastUpdated: r.lastUpdated,
                  })),
                )
              }
            />

            <p className="text-xs text-muted-foreground max-w-2xl">
              {costingRanAt ? (
                <>
                  Avg inventory cost uses the last costing snapshot (
                  {formatDate(costingRanAt, "datetime")}).{" "}
                  <Link href="/inventory/costing" className="text-primary underline-offset-4 hover:underline">
                    Run costing
                  </Link>{" "}
                  to refresh book values.
                </>
              ) : (
                <>
                  Run{" "}
                  <Link href="/inventory/costing" className="text-primary underline-offset-4 hover:underline">
                    inventory costing
                  </Link>{" "}
                  first so average cost can populate from receipts.
                </>
              )}
            </p>
          </div>

          {initialLoading ? (
            <div className="p-4">
              <SkeletonDataTable
                rows={pageSize}
                columnWidths={["w-40", "w-24", "w-24", "w-16", "w-24", "w-8", "w-20", "w-24", "w-8"]}
              />
            </div>
          ) : (
            <div className={cn(LIST_TABLE_SURFACE_CLASS, "min-h-0 flex-1 border-0 border-t rounded-none shadow-none")}>
              <TableLinearProgress active={tableBusy} />
              <div
                className={cn(
                  "transition-opacity duration-200",
                  tableBusy && "pointer-events-none opacity-60",
                )}
              >
                <DataTable<Product>
                  data={rows}
                  columns={columns}
                  scrollMode="fill"
                  className="border-0 shadow-none"
                  onRowClick={(row) => handleView(row.id)}
                  emptyMessage="No products match your filters. Create your first product to get started."
                />
              </div>
            </div>
          )}

          <TablePagination
            className="border-t px-4"
            pageOffset={pageOffset}
            pageSize={pageSize}
            itemCount={initialLoading ? 0 : rows.length}
            hasMore={hasMore}
            loading={initialLoading}
            busy={tableBusy}
            onPrevious={goToPreviousPage}
            onNext={goToNextPage}
            entityLabel="products"
            pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <Sheet open={batchSheetProductId != null} onOpenChange={(open) => !open && setBatchSheetProductId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pr-8">
            <SheetTitle>{rows.find((r) => r.id === batchSheetProductId)?.name ?? "Cost batches"}</SheetTitle>
            <SheetDescription>
              Receipt-based FIFO layers remaining in stock (after issues and transfers). Uses GRN line amounts plus
              landed-cost snapshots where available.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {layersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                Loading batches…
              </div>
            ) : layersPayload ? (
              <>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm grid gap-1 sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">Fifo qty total</span>{" "}
                    <span className="font-medium tabular-nums">{layersPayload.totalQty.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">System on-hand</span>{" "}
                    <span className="font-medium tabular-nums">{layersPayload.stockLevelQty.toLocaleString()}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Weighted avg (fifo layers)</span>{" "}
                    <span className="font-medium tabular-nums">
                      {layersPayload.totalQty > 0
                        ? `${formatMoney(layersPayload.averageUnitCost, layersPayload.currency)} / unit`
                        : "—"}
                    </span>
                  </div>
                  {!layersPayload.fifoMatchesStock ? (
                    <div className="sm:col-span-2 rounded border border-amber-500/40 bg-amber-950/30 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                      FIFO reconciliation differs from recorded stock — common after transfers or adjustments. Book cost
                      still uses costing run; batches are operational guidance.
                    </div>
                  ) : null}
                </div>
                {layersPayload.batches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No receipt layers found for remaining stock.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-medium">Warehouse</th>
                          <th className="px-3 py-2 font-medium">Qty</th>
                          <th className="px-3 py-2 font-medium text-right">Unit cost</th>
                          <th className="px-3 py-2 font-medium text-right">Line value</th>
                          <th className="px-3 py-2 font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {layersPayload.batches.map((b, i) => (
                          <tr key={`${b.reference ?? ""}-${b.date}-${i}`} className="border-t border-border/60">
                            <td className="px-3 py-2 align-top">
                              <div>{b.warehouseName}</div>
                              <div className="text-[11px] text-muted-foreground capitalize">
                                {b.sourceType.replace(/_/g, " ")}
                              </div>
                            </td>
                            <td className="px-3 py-2 tabular-nums">{b.quantity.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(b.unitCost, b.currency)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(b.lineValue, b.currency)}</td>
                            <td className="px-3 py-2 align-top">
                              <div className="text-xs text-muted-foreground">{new Date(b.date).toLocaleString()}</div>
                              {b.reference ? <div>{b.reference}</div> : null}
                              {b.grnId ? (
                                <Link
                                  href={`/inventory/receipts/${encodeURIComponent(b.grnId)}`}
                                  className="text-primary text-xs underline-offset-4 hover:underline inline-block mt-0.5"
                                >
                                  Open GRN
                                </Link>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
