"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LIST_PAGE_BODY_VIEWPORT_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_PAGINATION_CLASS,
  LIST_TABLE_SCROLL_BODY_CLASS,
  LIST_TABLE_VIEWPORT_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { FiltersBar } from "@/components/ui/filters-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { Button } from "@/components/ui/button";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createStockAdjustmentApi,
  fetchStockLevelsApi,
  fetchFranchiseNetworkStockAggregate,
  type InventoryStockRow,
  type FranchiseNetworkStockItem,
  type FranchiseOutletStockRow,
} from "@/lib/api/inventory-stock";
import {
  fetchLatestInventoryCosting,
  type InventoryCostingSnapshot,
} from "@/lib/api/inventory-costing";
import { fetchProductApi, fetchProductsPageApi } from "@/lib/api/products";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compareProductFamilyKeys, UNCATEGORIZED_FAMILY } from "@/lib/products/product-family";
import {
  downloadImportTemplateApi,
  importOpeningStockApi,
} from "@/lib/api/import-export";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

/** Weighted average book cost per product from latest inventory costing run. */
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

export default function StockLevelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkHandledRef = React.useRef(false);
  const canWrite = useCanWriteInventory();
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const templateId = useOrgContextStore((s) => s.templateId);
  const fmcg = isFmcgOrg(templateId);
  const isFranchisor = orgRole === "FRANCHISOR";

  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);
  const [stockItems, setStockItems] = React.useState<InventoryStockRow[]>([]);
  const [networkAgg, setNetworkAgg] = React.useState<FranchiseNetworkStockItem[]>([]);
  const [networkAggByProduct, setNetworkAggByProduct] = React.useState<Map<string, FranchiseNetworkStockItem>>(new Map());
  const [avgCostByProduct, setAvgCostByProduct] = React.useState<Map<string, number>>(new Map());
  const [costingRanAt, setCostingRanAt] = React.useState<string | null>(null);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  // Stock adjustment state
  const [savingAdjustment, setSavingAdjustment] = React.useState(false);
  const [adjusting, setAdjusting] = React.useState<InventoryStockRow | null>(null);
  const [adjustDelta, setAdjustDelta] = React.useState<string>("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [adjustMode, setAdjustMode] = React.useState<"INCREASE" | "DECREASE">("DECREASE");

  // Stock In (create level + qty) — Tally-style putaway / opening
  const [stockInOpen, setStockInOpen] = React.useState(false);
  const [stockInProductId, setStockInProductId] = React.useState("");
  const [stockInWarehouseId, setStockInWarehouseId] = React.useState("");
  const [stockInQty, setStockInQty] = React.useState("");
  const [stockInReason, setStockInReason] = React.useState("Opening / production putaway");
  const [stockInSaving, setStockInSaving] = React.useState(false);
  const [stockInProductOption, setStockInProductOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [warehouseLookup, setWarehouseLookup] = React.useState<LookupOption[]>([]);
  const [importingOpening, setImportingOpening] = React.useState(false);
  const openingStockInputRef = React.useRef<HTMLInputElement>(null);

  // Franchise drill-down sheet state
  const [franchiseDrillRow, setFranchiseDrillRow] = React.useState<FranchiseNetworkStockItem | null>(null);

  const refreshStock = React.useCallback(async () => {
    const first = !hasLoadedOnce.current;
    if (first) setInitialLoading(true);
    else setFetching(true);
    try {
      const requests: [
        Promise<InventoryStockRow[]>,
        Promise<{ items: FranchiseNetworkStockItem[] } | null>,
        Promise<InventoryCostingSnapshot | null>,
      ] = [
        fetchStockLevelsApi({
          warehouseId: warehouseFilter === "all" ? undefined : warehouseFilter,
          status: statusFilter as "In Stock" | "Low Stock" | "Out of Stock" | "all",
          search: searchQuery,
        }),
        isFranchisor
          ? fetchFranchiseNetworkStockAggregate({ search: searchQuery })
          : Promise.resolve(null),
        fmcg ? fetchLatestInventoryCosting().catch(() => null) : Promise.resolve(null),
      ];

      const [hqItems, aggResult, costing] = await Promise.all(requests);
      setStockItems(hqItems);

      const aggItems = aggResult?.items ?? [];
      setNetworkAgg(aggItems);
      setNetworkAggByProduct(new Map(aggItems.map((i) => [i.productId, i])));
      if (fmcg) {
        setAvgCostByProduct(weightedAvgBookCostByProduct(costing));
        setCostingRanAt(costing?.ranAt ?? null);
      }
      hasLoadedOnce.current = true;
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setInitialLoading(false);
      setFetching(false);
    }
  }, [searchQuery, statusFilter, warehouseFilter, isFranchisor, fmcg]);

  React.useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const handleOpeningStockImport = async (file: File | undefined) => {
    if (!file) return;
    setImportingOpening(true);
    try {
      const result = await importOpeningStockApi(file);
      const skipped = result.skipped?.length ?? 0;
      toast.success(
        `Opening stock imported: ${result.imported} line(s)` +
          (result.adjustmentNumber ? ` (${result.adjustmentNumber})` : "") +
          (skipped ? ` · ${skipped} skipped` : "")
      );
      await refreshStock();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Opening stock import failed");
    } finally {
      setImportingOpening(false);
      if (openingStockInputRef.current) openingStockInputRef.current.value = "";
    }
  };

  React.useEffect(() => {
    void refreshStock();
  }, [refreshStock]);

  React.useEffect(() => {
    if (!canWrite) return;
    void fetchWarehouseOptions()
      .then((opts) => {
        setWarehouseLookup(opts);
        setStockInWarehouseId((prev) => prev || opts[0]?.id || "");
      })
      .catch(() => setWarehouseLookup([]));
  }, [canWrite]);

  const loadStockInProducts = React.useCallback(async (query: string): Promise<AsyncSearchableSelectOption[]> => {
    const page = await fetchProductsPageApi({ search: query || undefined, status: "ACTIVE", limit: 10 });
    return page.items.map((p) => ({
      id: p.id,
      label: `${p.sku ? `${p.sku} — ` : ""}${p.name}`,
    }));
  }, []);

  React.useEffect(() => {
    if (deepLinkHandledRef.current) return;
    const action = searchParams.get("action");
    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");
    const search = searchParams.get("search");
    if (!action && !productId && !warehouseId && !search) return;

    deepLinkHandledRef.current = true;
    if (search) {
      setSearchInput(search);
      setSearchQuery(search);
    }
    if (warehouseId) setStockInWarehouseId(warehouseId);
    if (productId) {
      setStockInProductId(productId);
      void fetchProductApi(productId)
        .then((product) => {
          if (!product) return;
          setStockInProductOption({
            id: product.id,
            label: `${product.sku ? `${product.sku} — ` : ""}${product.name}`,
          });
        })
        .catch(() => undefined);
    }
    if (action === "stockIn" && canWrite) {
      setStockInOpen(true);
      setStockInQty("");
      setStockInReason(fmcg ? "Opening / production putaway" : "Opening stock");
    }
    router.replace("/inventory/stock-levels", { scroll: false });
  }, [searchParams, canWrite, fmcg, router]);

  const openStockIn = () => {
    setStockInOpen(true);
    setStockInQty("");
    setStockInProductId("");
    setStockInProductOption(null);
    setStockInReason(fmcg ? "Opening / production putaway" : "Opening stock");
    if (!stockInWarehouseId && warehouseLookup[0]?.id) {
      setStockInWarehouseId(warehouseLookup[0].id);
    }
  };

  const handleStockIn = async () => {
    const qty = parseFloat(stockInQty);
    if (!stockInProductId) {
      toast.error("Select a product.");
      return;
    }
    if (!stockInWarehouseId) {
      toast.error("Select a warehouse.");
      return;
    }
    if (!qty || Number.isNaN(qty) || qty <= 0) {
      toast.error("Enter a positive quantity.");
      return;
    }
    try {
      setStockInSaving(true);
      const res = await createStockAdjustmentApi({
        productId: stockInProductId,
        warehouseId: stockInWarehouseId,
        quantityDelta: qty,
        reason: stockInReason.trim() || "Stock In",
      });
      toast.success(`Stock In posted (${res.number}). Pick & pack can use this quantity.`);
      setStockInOpen(false);
      await refreshStock();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setStockInSaving(false);
    }
  };

  const filteredItems = React.useMemo(() => {
    const arr = [...stockItems];
    const famKey = (f: string | null | undefined) => {
      const t = f?.trim();
      return t || UNCATEGORIZED_FAMILY;
    };
    arr.sort((a, b) => {
      const c = compareProductFamilyKeys(famKey(a.productFamily), famKey(b.productFamily));
      if (c !== 0) return c;
      return (a.sku ?? "").localeCompare(b.sku ?? "", undefined, { numeric: true });
    });
    return arr;
  }, [stockItems]);

  React.useEffect(() => {
    setPageOffset(0);
  }, [searchQuery, warehouseFilter, statusFilter, pageSize]);

  const pagedItems = React.useMemo(
    () => filteredItems.slice(pageOffset, pageOffset + pageSize),
    [filteredItems, pageOffset, pageSize]
  );

  const warehouseOptions = React.useMemo(() => {
    const options = new Map<string, string>();
    warehouseLookup.forEach((w) => options.set(w.id, w.label));
    stockItems.forEach((item) => {
      options.set(item.warehouseId ?? item.warehouse, item.warehouse);
    });
    return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
  }, [stockItems, warehouseLookup]);

  const openStockDetail = (row: InventoryStockRow) => {
    router.push(`/inventory/stock-levels/${row.id}`);
  };

  const openAdjust = (row: InventoryStockRow) => {
    setAdjusting(row);
    setAdjustDelta("");
    setAdjustReason("");
  };

  const handleApplyAdjustment = async () => {
    if (!adjusting) {
      setAdjusting(null);
      return;
    }

    const numeric = parseFloat(adjustDelta);
    if (!numeric || Number.isNaN(numeric)) {
      toast.error("Enter a valid quantity.");
      return;
    }
    const magnitude = Math.abs(numeric);
    const signedDelta = adjustMode === "INCREASE" ? magnitude : -magnitude;
    try {
      setSavingAdjustment(true);
      await createStockAdjustmentApi({
        stockLevelId: adjusting.id,
        quantityDelta: signedDelta,
        reason: adjustReason.trim() || undefined,
      });
      toast.success("Stock adjustment posted.");
      setAdjusting(null);
      await refreshStock();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSavingAdjustment(false);
    }
  };

  const franchiseNetworkTotalQty = React.useMemo(
    () => networkAgg.reduce((s, i) => s + i.totalAvailable, 0),
    [networkAgg]
  );
  const franchiseNetworkTotalValue = React.useMemo(
    () => networkAgg.reduce((s, i) => s + i.networkValueKes, 0),
    [networkAgg]
  );

  const columns = [
    // Seafood: "Product" = product family (e.g. Tilapia). FMCG has no family — show product name.
    {
      id: fmcg ? "name" : "productFamily",
      header: "Product",
      accessor: (row: InventoryStockRow) =>
        fmcg ? row.name?.trim() || "—" : row.productFamily?.trim() || "—",
      sticky: true,
    },
    {
      id: "sku",
      header: "SKU",
      accessor: (row: InventoryStockRow) =>
        fmcg ? (
          <div className="font-medium font-mono">{row.sku}</div>
        ) : (
          <div>
            <div className="font-medium font-mono">{row.sku}</div>
            <div className="text-xs text-muted-foreground">{row.name}</div>
          </div>
        ),
    },
    {
      id: "warehouse",
      header: "Warehouse",
      accessor: (row: InventoryStockRow) => row.warehouse,
    },
    {
      id: "location",
      header: "Location",
      accessor: (row: InventoryStockRow) => row.location ?? "—",
    },
    {
      id: "quantity",
      header: "Quantity",
      accessor: (row: InventoryStockRow) => (
        <div className="text-right font-medium">
          {row.quantity.toLocaleString()}
          {row.uom ? <span className="ml-1 text-muted-foreground text-xs">{row.uom}</span> : null}
        </div>
      ),
    },
    {
      id: "reserved",
      header: "Reserved",
      accessor: (row: InventoryStockRow) => (
        <div className="text-right text-muted-foreground">{row.reserved}</div>
      ),
    },
    {
      id: "available",
      header: "Available",
      accessor: (row: InventoryStockRow) => (
        <div className="text-right font-semibold">{row.available}</div>
      ),
    },
    ...(fmcg
      ? [
          {
            id: "avgCost",
            header: "Avg inventory cost",
            accessor: (row: InventoryStockRow) => {
              const pid = row.productId;
              const v = pid ? avgCostByProduct.get(pid) : undefined;
              if (v == null) {
                return <div className="text-right text-muted-foreground">—</div>;
              }
              return (
                <div className="text-right tabular-nums text-sm">{formatMoney(v, "KES")}</div>
              );
            },
          },
          {
            id: "inventoryValue",
            header: "Inventory value",
            accessor: (row: InventoryStockRow) => {
              const pid = row.productId;
              const unit = pid ? avgCostByProduct.get(pid) : undefined;
              if (unit == null) {
                return <div className="text-right text-muted-foreground">—</div>;
              }
              return (
                <div className="text-right tabular-nums text-sm font-medium">
                  {formatMoney(unit * (row.quantity ?? 0), "KES")}
                </div>
              );
            },
          },
        ]
      : []),
    ...(isFranchisor
      ? [
          {
            id: "franchiseNetwork",
            header: "Franchise network",
            accessor: (row: InventoryStockRow) => {
              const agg = row.productId ? networkAggByProduct.get(row.productId) : undefined;
              if (!agg) {
                return <div className="text-right text-muted-foreground text-xs">—</div>;
              }
              return (
                <button
                  type="button"
                  className="text-right w-full group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFranchiseDrillRow(agg);
                  }}
                >
                  <div className="font-semibold tabular-nums group-hover:underline">
                    {agg.totalAvailable.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {agg.byOutlet.length} outlet{agg.byOutlet.length !== 1 ? "s" : ""}
                    {agg.networkValueKes > 0 && (
                      <span className="ml-1">
                        · KES {Math.round(agg.networkValueKes).toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              );
            },
          },
        ]
      : []),
    {
      id: "reorderLevel",
      header: "Reorder Level",
      accessor: (row: InventoryStockRow) => (
        <div className="text-right">{row.reorderLevel}</div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (row: InventoryStockRow) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "",
      accessor: (row: InventoryStockRow) => (
        <RowActions
          actions={[
            {
              label: "View Details",
              icon: "Eye",
              onClick: (e) => { e?.stopPropagation?.(); openStockDetail(row); },
            },
            ...(canWrite
              ? [
                  {
                    label: "Adjust Stock",
                    icon: "Edit" as const,
                    onClick: (e?: React.MouseEvent) => { e?.stopPropagation?.(); openAdjust(row); },
                  },
                  {
                    label: "Transfer",
                    icon: "ArrowLeftRight" as const,
                    onClick: (e?: React.MouseEvent) => {
                      e?.stopPropagation?.();
                      router.push(`/warehouse/transfers?from=${row.id}`);
                    },
                  },
                ]
              : []),
          ]}
        />
      ),
      className: "w-[50px]",
    },
  ];

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Stock Levels"
        description={
          fmcg
            ? "On-hand by warehouse. Work orders issue components and receive finished goods."
            : "On-hand inventory by warehouse"
        }
        sticky
        dense
        showCommandHint
        actions={
          <>
            <Button variant="outline">
              <Icons.Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            {canWrite && (
              <>
                <input
                  ref={openingStockInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  className="hidden"
                  onChange={(e) => void handleOpeningStockImport(e.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  disabled={importingOpening}
                  onClick={() => openingStockInputRef.current?.click()}
                >
                  <Icons.Upload className="mr-2 h-4 w-4" />
                  {importingOpening ? "Importing…" : "Import opening stock"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    downloadImportTemplateApi("opening-stock", (msg) =>
                      toast.info(msg || "Template unavailable.")
                    )
                  }
                >
                  CSV template
                </Button>
                <Button onClick={openStockIn}>
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  {fmcg ? "Stock In" : "Stock In / Opening"}
                </Button>
              </>
            )}
          </>
        }
      />
      <div className={LIST_PAGE_BODY_VIEWPORT_CLASS}>
      {fmcg && !initialLoading && stockItems.length === 0 && canWrite ? (
        <div className="shrink-0 rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-50">
          <p className="font-medium flex items-start gap-2">
            <Icons.Info className="h-4 w-4 shrink-0 mt-0.5" />
            No stock yet — Pick &amp; Pack cannot ship until goods are in a warehouse.
          </p>
          <p className="mt-1 text-xs opacity-90 pl-6">
            Tally-style flow: <span className="font-medium">Stock In</span> (production / opening) → Sales order →
            Delivery note → Pick &amp; pack → Dispatch. Purchased goods can also enter via GRN later.
          </p>
          <Button size="sm" className="mt-3 ml-6" onClick={openStockIn}>
            Stock In to MAIN
          </Button>
        </div>
      ) : null}
      {fmcg && !initialLoading && stockItems.length > 0 && !costingRanAt ? (
        <p className="shrink-0 text-xs text-muted-foreground">
          Run{" "}
          <Link href="/inventory/costing" className="text-primary underline underline-offset-2">
            inventory costing
          </Link>{" "}
          so avg inventory cost and value populate on this list.
        </p>
      ) : null}
      {isFranchisor && networkAgg.length > 0 && (
        <div className="shrink-0 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
            <Icons.Store className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Franchise network total available:</span>
            <span className="font-semibold tabular-nums">
              {franchiseNetworkTotalQty.toLocaleString()}
            </span>
            {franchiseNetworkTotalValue > 0 && (
              <span className="text-muted-foreground">
                · KES {Math.round(franchiseNetworkTotalValue).toLocaleString()} at HQ cost
              </span>
            )}
            <span className="text-xs text-muted-foreground">(management — not HQ GL inventory)</span>
          </div>
        </div>
      )}

        <FiltersBar
          className="shrink-0 rounded-xl p-2"
          searchPlaceholder="Search by SKU or product name..."
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchInputDataHint="search"
          filters={[
            {
              id: "warehouse",
              label: "Warehouse",
              options: [
                { label: "All Warehouses", value: "all" },
                ...warehouseOptions,
              ],
              value: warehouseFilter,
              onChange: setWarehouseFilter,
            },
            {
              id: "status",
              label: "Status",
              options: [
                { label: "All Statuses", value: "all" },
                { label: "In Stock", value: "In Stock" },
                { label: "Low Stock", value: "Low Stock" },
                { label: "Out of Stock", value: "Out of Stock" },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
          ]}
          activeFiltersCount={[warehouseFilter, statusFilter].filter((v) => v !== "all").length}
          onClearFilters={() => {
            setWarehouseFilter("all");
            setStatusFilter("all");
            setSearchInput("");
            setSearchQuery("");
          }}
        />
        <div className={LIST_TABLE_VIEWPORT_CLASS}>
          <TableLinearProgress active={fetching || searchInput.trim() !== searchQuery} />
          {initialLoading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              Loading stock levels...
            </div>
          ) : (
            <div
              className={`${LIST_TABLE_SCROLL_BODY_CLASS} ${
                (fetching || searchInput.trim() !== searchQuery) ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <DataTable
                data={pagedItems}
                columns={columns}
                onRowClick={(row) => openStockDetail(row)}
                emptyMessage="No stock items found. Made SKUs only appear after a work order is completed (or Stock In for opening)."
                scrollMode="fill"
                size="comfortable"
                className="min-h-0 flex-1 border-0"
              />
            </div>
          )}
          {!initialLoading && filteredItems.length > 0 ? (
            <TablePagination
              className={`${LIST_TABLE_PAGINATION_CLASS} rounded-none border-0 border-t shadow-none bg-card`}
              pageOffset={pageOffset}
              pageSize={pageSize}
              itemCount={pagedItems.length}
              totalCount={filteredItems.length}
              hasMore={pageOffset + pageSize < filteredItems.length}
              onPrevious={() => setPageOffset((offset) => Math.max(0, offset - pageSize))}
              onNext={() => setPageOffset((offset) => offset + pageSize)}
              entityLabel="stock lines"
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPageOffset(0);
              }}
            />
          ) : null}
        </div>
      </div>

      {/* Franchise network drill-down sheet */}
      {franchiseDrillRow && (
        <Sheet open onOpenChange={(open) => !open && setFranchiseDrillRow(null)}>
          <SheetContent side="right" className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>
                <span className="font-mono">{franchiseDrillRow.sku}</span>
                {" "}— franchise stock
              </SheetTitle>
              <SheetDescription>
                {franchiseDrillRow.productName} · {franchiseDrillRow.byOutlet.length} outlet
                {franchiseDrillRow.byOutlet.length !== 1 ? "s" : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="py-4 space-y-4">
              {/* Network totals summary */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground uppercase">Total on hand</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {franchiseDrillRow.totalQty.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground uppercase">Available</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {franchiseDrillRow.totalAvailable.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground uppercase">Value (KES)</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {franchiseDrillRow.networkValueKes > 0
                      ? Math.round(franchiseDrillRow.networkValueKes).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>

              {franchiseDrillRow.unitCostKes > 0 && (
                <p className="text-xs text-muted-foreground">
                  Valued at HQ unit cost of KES {franchiseDrillRow.unitCostKes.toLocaleString()} from latest
                  costing snapshot. Management figure — not HQ general-ledger inventory after intercompany sale.
                </p>
              )}

              {/* Per-outlet breakdown */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  By outlet
                </div>
                <div className="divide-y rounded-md border overflow-hidden">
                  {franchiseDrillRow.byOutlet.map((outlet: FranchiseOutletStockRow) => (
                    <div
                      key={`${outlet.childOrgId}-${outlet.warehouseId}`}
                      className="flex items-center justify-between px-3 py-2.5 text-sm bg-card"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/franchise/outlets/${outlet.childOrgId}?tab=stock`}
                          className="font-medium hover:underline truncate block"
                          onClick={() => setFranchiseDrillRow(null)}
                        >
                          {outlet.outletName}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate">
                          {outlet.warehouseName}
                        </div>
                      </div>
                      <div className="text-right tabular-nums shrink-0 ml-4">
                        <div className="font-semibold">{outlet.available.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          on hand {outlet.qty.toLocaleString()}
                          {outlet.reserved > 0 && <span> · rsvd {outlet.reserved}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setFranchiseDrillRow(null)}>
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Stock adjustment sheet */}
      {adjusting && (
        <Sheet open onOpenChange={(open) => !open && setAdjusting(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Stock adjustment — {adjusting.sku}</SheetTitle>
              <SheetDescription>
                {adjusting.name} · {adjusting.warehouse}
                {adjusting.location ? ` · ${adjusting.location}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">On hand</div>
                  <div className="text-lg font-semibold">{adjusting.quantity}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Available</div>
                  <div className="text-lg font-semibold">{adjusting.available}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adjustment type</Label>
                <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    className={`px-2 py-1 rounded-sm ${
                      adjustMode === "INCREASE" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setAdjustMode("INCREASE")}
                  >
                    Increase
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 rounded-sm ${
                      adjustMode === "DECREASE" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setAdjustMode("DECREASE")}
                  >
                    Decrease
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Adjustment quantity</Label>
                <Input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta((e.target as HTMLInputElement).value)}
                  placeholder="Enter quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Cycle count, damage, write-off"
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setAdjusting(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleApplyAdjustment()}
                disabled={savingAdjustment || !adjustDelta || Number.isNaN(parseFloat(adjustDelta)) || parseFloat(adjustDelta) <= 0}
              >
                {savingAdjustment ? "Applying..." : "Apply adjustment"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Stock In — create warehouse quantity for a product (unblocks pick & pack) */}
      <Sheet open={stockInOpen} onOpenChange={setStockInOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Stock In</SheetTitle>
            <SheetDescription>
              {fmcg
                ? "Put finished goods into a warehouse (opening balance or production putaway). Same idea as Tally stock journal / godown receipt."
                : "Create or increase on-hand quantity for a product in a warehouse."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <AsyncSearchableSelect
                value={stockInProductId}
                selectedOption={stockInProductOption}
                onValueChange={setStockInProductId}
                onOptionSelect={setStockInProductOption}
                loadOptions={loadStockInProducts}
                placeholder="Search SKU or name…"
                searchPlaceholder="Type to search — fetches 10 matches from the server"
                emptyMessage="No matching product."
                searchDebounceMs={SEARCH_DEBOUNCE_MS}
                floating={false}
              />
              <p className="text-xs text-muted-foreground">
                Stock In adds quantity without consuming a recipe. To make a formula SKU, create a work order from
                Production Plan and complete it.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={stockInWarehouseId || undefined} onValueChange={setStockInWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseLookup.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={stockInQty}
                onChange={(e) => setStockInQty(e.target.value)}
                placeholder="e.g. 100"
              />
              <p className="text-xs text-muted-foreground">
                Always post in <span className="font-medium text-foreground">pieces (smallest / base UOM)</span> — the warehouse
                ledger. Sales orders may use cartons; pick &amp; pack converts using product packaging (e.g. 1 carton = 24 pcs).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={stockInReason}
                onChange={(e) => setStockInReason(e.target.value)}
                placeholder="Opening / production putaway"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setStockInOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleStockIn()} disabled={stockInSaving}>
              {stockInSaving ? "Posting…" : "Post Stock In"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
