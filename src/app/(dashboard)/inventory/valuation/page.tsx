"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { fetchInventoryValuationPage } from "@/lib/api/inventory-costing";
import {
  fetchFranchiseNetworkStockAggregatePage,
  type FranchiseNetworkStockItem,
} from "@/lib/api/inventory-stock";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 300;

function costingMethodLabel(method: string | null): string {
  switch (method) {
    case "WEIGHTED_AVERAGE":
      return "Weighted average";
    case "FIFO":
      return "FIFO";
    case "STANDARD_COST":
      return "Standard cost";
    default:
      return method ? method.replaceAll("_", " ").toLowerCase() : "";
  }
}

function formatSnapshotWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type ValuationRow = {
  code: string;
  sku: string;
  productName: string;
  warehouseName: string;
  unitCost: number;
  stockQty: number;
  stockValue: number;
  inSnapshot: boolean;
};

export default function InventoryValuationPage() {
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const isFranchisor = orgRole === "FRANCHISOR";
  const currency = useBaseCurrency();

  const [valuationRows, setValuationRows] = React.useState<ValuationRow[]>([]);
  const [summary, setSummary] = React.useState<
    Array<{
      warehouseId: string;
      warehouse: string;
      skuCount: number;
      totalQty: number;
      totalValue: number;
    }>
  >([]);
  const [ranAt, setRanAt] = React.useState<string | null>(null);
  const [method, setMethod] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);

  const [franchiseRows, setFranchiseRows] = React.useState<FranchiseNetworkStockItem[]>([]);
  const [franchiseLoading, setFranchiseLoading] = React.useState(false);
  const [franchiseCostingRanAt, setFranchiseCostingRanAt] = React.useState<string | null>(null);
  const [frTotalCount, setFrTotalCount] = React.useState(0);
  const [frHasMore, setFrHasMore] = React.useState(false);
  const [frTotals, setFrTotals] = React.useState({ totalAvailable: 0, networkValueKes: 0 });

  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [frPageOffset, setFrPageOffset] = React.useState(0);
  const [frPageSize, setFrPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const valuationLoadedOnce = React.useRef(false);
  const franchiseLoadedOnce = React.useRef(false);

  React.useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const loadValuationPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !valuationLoadedOnce.current;
      if (isFirstLoad) setLoading(true);
      setLoadError(null);
      try {
        const payload = await fetchInventoryValuationPage({
          limit: pageSize,
          cursor: String(offset),
          search: searchQuery || undefined,
        });
        setRanAt(payload.ranAt);
        setMethod(payload.method);
        setSummary(payload.summary);
        setValuationRows(
          payload.rows.map((row) => ({
            code: row.code?.trim() || row.sku,
            sku: row.sku,
            productName: row.productName,
            warehouseName: row.warehouseName ?? row.warehouseId,
            unitCost: row.unitCost,
            stockQty: row.quantity,
            stockValue: row.inventoryValue,
            inSnapshot: row.inSnapshot !== false,
          }))
        );
        setPageOffset(payload.offset);
        setTotalCount(payload.total);
        setHasMore(payload.hasMore);
        valuationLoadedOnce.current = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load valuation.";
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, searchQuery]
  );

  React.useEffect(() => {
    void loadValuationPage(0);
  }, [loadValuationPage]);

  const loadFranchisePage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !franchiseLoadedOnce.current;
      if (isFirstLoad) setFranchiseLoading(true);
      try {
        const result = await fetchFranchiseNetworkStockAggregatePage({
          limit: frPageSize,
          cursor: String(offset),
        });
        setFranchiseRows(result.items);
        setFranchiseCostingRanAt(result.costingRanAt);
        setFrPageOffset(result.offset);
        setFrTotalCount(result.total);
        setFrHasMore(result.hasMore);
        setFrTotals(result.totals);
        franchiseLoadedOnce.current = true;
      } catch {
        // franchise table is supplementary
      } finally {
        setFranchiseLoading(false);
      }
    },
    [frPageSize]
  );

  React.useEffect(() => {
    if (!isFranchisor) return;
    void loadFranchisePage(0);
  }, [isFranchisor, loadFranchisePage]);

  const totalDisplayValue = summary.reduce((sum, row) => sum + row.totalValue, 0);
  const franchiseTotalQty = frTotals.totalAvailable;
  const franchiseTotalValue = frTotals.networkValueKes;

  const franchiseColumns = [
    {
      id: "sku",
      header: "SKU",
      accessor: (r: FranchiseNetworkStockItem) => (
        <span className="font-mono text-sm">{r.sku}</span>
      ),
    },
    {
      id: "name",
      header: "Product",
      accessor: (r: FranchiseNetworkStockItem) => r.productName,
    },
    {
      id: "outlets",
      header: "Outlets",
      className: "text-right",
      accessor: (r: FranchiseNetworkStockItem) => (
        <span className="tabular-nums text-muted-foreground">{r.byOutlet.length}</span>
      ),
    },
    {
      id: "qty",
      header: "In stock",
      className: "text-right",
      accessor: (r: FranchiseNetworkStockItem) => (
        <span className="tabular-nums font-medium">{r.totalAvailable.toLocaleString()}</span>
      ),
    },
    {
      id: "unitCost",
      header: "Head office unit cost",
      className: "text-right",
      accessor: (r: FranchiseNetworkStockItem) => (
        <span className="tabular-nums text-muted-foreground">
          {r.unitCostKes > 0 ? formatMoney(r.unitCostKes, "KES") : "—"}
        </span>
      ),
    },
    {
      id: "value",
      header: "Stock value",
      className: "text-right",
      accessor: (r: FranchiseNetworkStockItem) => (
        <span className="tabular-nums font-semibold">
          {r.networkValueKes > 0 ? formatMoney(r.networkValueKes, "KES") : "—"}
        </span>
      ),
    },
  ];

  const columns = [
    {
      id: "code",
      header: "Code",
      sticky: true,
      sortValue: (r: ValuationRow) => r.code,
      accessor: (r: ValuationRow) => <span className="font-mono text-sm">{r.code || "—"}</span>,
    },
    {
      id: "name",
      header: "Product",
      sortValue: (r: ValuationRow) => r.productName,
      accessor: (r: ValuationRow) => (
        <div>
          <div>{r.productName}</div>
          {r.inSnapshot ? null : (
            <div className="text-xs text-muted-foreground">No cost yet</div>
          )}
        </div>
      ),
    },
    { id: "wh", header: "Warehouse", accessor: (r: ValuationRow) => r.warehouseName },
    {
      id: "unitCost",
      header: "Unit cost",
      className: "text-right",
      sortValue: (r: ValuationRow) => (r.inSnapshot ? r.unitCost : null),
      accessor: (r: ValuationRow) => (
        <span className="tabular-nums">{r.inSnapshot ? formatMoney(r.unitCost, currency) : "—"}</span>
      ),
    },
    {
      id: "stock",
      header: "In stock",
      className: "text-right",
      accessor: (r: ValuationRow) => <span className="tabular-nums">{r.stockQty.toLocaleString()}</span>,
      sortValue: (r: ValuationRow) => r.stockQty,
    },
    {
      id: "value",
      header: "Stock value",
      className: "text-right",
      sortValue: (r: ValuationRow) => (r.inSnapshot ? r.stockValue : null),
      accessor: (r: ValuationRow) => (
        <span className="tabular-nums font-medium">{r.inSnapshot ? formatMoney(r.stockValue, currency) : "—"}</span>
      ),
    },
  ];

  const emptyMessage = loading
    ? "Loading stock value…"
    : loadError
      ? "Could not load stock value."
      : searchQuery
        ? `No products match “${searchQuery}”.`
      : ranAt === null && valuationRows.length === 0
        ? "No stock value yet. Run costing to calculate it."
        : "No products match this search.";

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Inventory valuation"
        description="Stock value by product and warehouse, from your latest costing run."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/costing" }, { label: "Valuation" }]}
        sticky
        showCommandHint
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {loadError ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <div className="font-medium">Stock value unavailable</div>
              <div className="mt-1 text-destructive/90">{loadError}</div>
            </div>
          </div>
        ) : null}

        {!loading && ranAt === null && valuationRows.length === 0 && !loadError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-muted-foreground/20 bg-muted/40 px-4 py-3 text-sm">
            <Icons.Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
              <span>No stock value yet. Run costing and the amounts will show here.</span>
              <Button asChild size="sm" variant="secondary">
                <Link href="/inventory/costing">Run costing</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Stock value</CardTitle>
                <CardDescription className="max-w-3xl space-y-1">
                  <span className="block">
                    These amounts come from your last costing run. New receipts and extra costs show up after you{" "}
                    <Link href="/inventory/costing" className="font-medium text-foreground underline underline-offset-2">
                      run costing
                    </Link>
                    . To record a company opening cost, open{" "}
                    <Link href="/inventory/opening-costs" className="font-medium text-foreground underline underline-offset-2">
                      opening costs
                    </Link>
                    .
                  </span>
                  {ranAt ? (
                    <span className="block text-xs text-muted-foreground">
                      Last updated {formatSnapshotWhen(ranAt)}
                      {method ? ` · ${costingMethodLabel(method)}` : ""}
                    </span>
                  ) : (
                    <span className="block text-xs text-muted-foreground">
                      Nothing to show until costing has been run.
                    </span>
                  )}
                </CardDescription>
              </div>
              {!loading && (totalCount > 0 || summary.length > 0) ? (
                <div className="text-right text-sm tabular-nums">
                  <div className="text-muted-foreground">Total stock value</div>
                  <div className="text-lg font-semibold">{formatMoney(totalDisplayValue, currency)}</div>
                </div>
              ) : null}
            </div>
          </CardHeader>
          {summary.length > 0 ? (
            <CardContent className="border-b py-3 bg-muted/30">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">By warehouse</div>
              <div className="flex flex-wrap gap-2">
                {summary.map((s) => (
                  <div
                    key={s.warehouseId}
                    className={cn(
                      "rounded-md border bg-card px-3 py-2 text-sm",
                      "min-w-[12rem] flex-1"
                    )}
                  >
                    <div className="font-medium">{s.warehouse}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {s.skuCount.toLocaleString()} {s.skuCount === 1 ? "product" : "products"}
                      {" · "}
                      {s.totalQty.toLocaleString()} in stock
                    </div>
                    <div className="mt-1 font-semibold tabular-nums">{formatMoney(s.totalValue, currency)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : null}
          <CardContent className="p-0">
            <DataTable
              dataScope="page"
              serverSearch
              search={searchInput}
              onSearchChange={(value) => {
                setSearchInput(value);
                setPageOffset(0);
              }}
              searchPlaceholder="Product code, name, or warehouse"
              totalCount={totalCount}
              data={valuationRows}
              columns={columns}
              emptyMessage={emptyMessage}
              scrollMode="natural"
              size="comfortable"
            />
          </CardContent>
        </Card>

        <TablePagination
          pageOffset={pageOffset}
          pageSize={pageSize}
          itemCount={valuationRows.length}
          totalCount={totalCount || undefined}
          hasMore={hasMore}
          loading={loading}
          onPrevious={() => {
            if (pageOffset <= 0 || loading) return;
            void loadValuationPage(Math.max(0, pageOffset - pageSize));
          }}
          onNext={() => {
            if (!hasMore || loading) return;
            void loadValuationPage(pageOffset + pageSize);
          }}
          entityLabel="products"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageOffset(0);
          }}
        />

        {isFranchisor && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Icons.Store className="h-4 w-4 text-muted-foreground" />
                      Stock at franchise outlets
                    </CardTitle>
                    <CardDescription className="max-w-3xl space-y-1">
                      <span className="block">
                        Quantities at active outlets, priced at the latest head-office unit cost. Head office already recorded the sale when the goods were invoiced, so this stock sits on the franchisee’s books.
                      </span>
                      {franchiseCostingRanAt ? (
                        <span className="block text-xs text-muted-foreground">
                          Unit costs from {formatSnapshotWhen(franchiseCostingRanAt)}. Products with no costing run yet show no value.
                        </span>
                      ) : null}
                    </CardDescription>
                  </div>
                  {!franchiseLoading && frTotalCount > 0 && (
                    <div className="text-right text-sm tabular-nums">
                      <div className="text-muted-foreground">Available at outlets</div>
                      <div className="text-lg font-semibold">{franchiseTotalQty.toLocaleString()}</div>
                      {franchiseTotalValue > 0 ? (
                        <>
                          <div className="mt-1 text-muted-foreground">At head-office cost</div>
                          <div className="text-base font-semibold">{formatMoney(franchiseTotalValue, "KES")}</div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {franchiseLoading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Loading outlet stock…
                  </div>
                ) : frTotalCount === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No outlet stock yet. It appears here after an outlet receives goods.
                  </div>
                ) : (
                  <DataTable dataScope="page"
                    data={franchiseRows}
                    columns={franchiseColumns}
                    emptyMessage="No franchise stock data."
                    scrollMode="natural"
                    size="comfortable"
                  />
                )}
              </CardContent>
            </Card>

            {frTotalCount > 0 && (
              <TablePagination
                pageOffset={frPageOffset}
                pageSize={frPageSize}
                itemCount={franchiseRows.length}
                totalCount={frTotalCount || undefined}
                hasMore={frHasMore}
                loading={franchiseLoading}
                onPrevious={() => {
                  if (frPageOffset <= 0 || franchiseLoading) return;
                  void loadFranchisePage(Math.max(0, frPageOffset - frPageSize));
                }}
                onNext={() => {
                  if (!frHasMore || franchiseLoading) return;
                  void loadFranchisePage(frPageOffset + frPageSize);
                }}
                entityLabel="outlet products"
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => {
                  setFrPageSize(size);
                  setFrPageOffset(0);
                }}
              />
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
