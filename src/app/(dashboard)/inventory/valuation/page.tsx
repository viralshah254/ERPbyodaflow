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
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type ValuationRow = {
  sku: string;
  productName: string;
  warehouseName: string;
  unitCost: number;
  stockQty: number;
  stockValue: number;
};

export default function InventoryValuationPage() {
  const orgRole = useOrgContextStore((s) => s.orgRole);
  const isFranchisor = orgRole === "FRANCHISOR";

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
  const [frPageOffset, setFrPageOffset] = React.useState(0);
  const [frPageSize, setFrPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const valuationLoadedOnce = React.useRef(false);
  const franchiseLoadedOnce = React.useRef(false);

  const loadValuationPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !valuationLoadedOnce.current;
      if (isFirstLoad) setLoading(true);
      setLoadError(null);
      try {
        const payload = await fetchInventoryValuationPage({
          limit: pageSize,
          cursor: String(offset),
        });
        setRanAt(payload.ranAt);
        setMethod(payload.method);
        setSummary(payload.summary);
        setValuationRows(
          payload.rows.map((row) => ({
            sku: row.sku,
            productName: row.productName,
            warehouseName: row.warehouseName ?? row.warehouseId,
            unitCost: row.unitCost,
            stockQty: row.quantity,
            stockValue: row.inventoryValue,
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
    [pageSize]
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
      accessor: (r: FranchiseNetworkStockItem) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {r.byOutlet.length}
        </div>
      ),
    },
    {
      id: "qty",
      header: "Available qty",
      accessor: (r: FranchiseNetworkStockItem) => (
        <div className="text-right tabular-nums font-medium">
          {r.totalAvailable.toLocaleString()}
        </div>
      ),
    },
    {
      id: "unitCost",
      header: "HQ unit cost",
      accessor: (r: FranchiseNetworkStockItem) => (
        <div className="text-right tabular-nums text-muted-foreground">
          {r.unitCostKes > 0 ? `KES ${r.unitCostKes.toLocaleString()}` : "\u2014"}
        </div>
      ),
    },
    {
      id: "value",
      header: "Value (KES)",
      accessor: (r: FranchiseNetworkStockItem) => (
        <div className="text-right tabular-nums font-semibold">
          {r.networkValueKes > 0 ? Math.round(r.networkValueKes).toLocaleString() : "\u2014"}
        </div>
      ),
    },
  ];

  const columns = [
    { id: "sku", header: "SKU", accessor: (r: ValuationRow) => r.sku, sticky: true },
    { id: "name", header: "Product", accessor: (r: ValuationRow) => r.productName },
    { id: "wh", header: "Warehouse", accessor: (r: ValuationRow) => r.warehouseName },
    { id: "unitCost", header: "Unit cost", accessor: (r: ValuationRow) => r.unitCost.toLocaleString() },
    { id: "stock", header: "Stock qty", accessor: (r: ValuationRow) => r.stockQty.toLocaleString() },
    { id: "value", header: "Stock value", accessor: (r: ValuationRow) => r.stockValue.toLocaleString() },
  ];

  const emptyMessage = loading
    ? "Loading valuation\u2026"
    : loadError
      ? "Could not load valuation."
      : ranAt === null && valuationRows.length === 0
        ? "No valuation snapshot yet. Run costing to persist inventory values."
        : "No rows match the current data.";

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Inventory Valuation"
        description="Latest costing snapshot per SKU and warehouse\u2014run costing to refresh; GL tie-out is done with finance outside this screen."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/costing" }, { label: "Valuation" }]}
        sticky
        showCommandHint
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {loadError ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <div className="font-medium">Valuation unavailable</div>
              <div className="mt-1 text-destructive/90">{loadError}</div>
            </div>
          </div>
        ) : null}

        {!loading && ranAt === null && valuationRows.length === 0 && !loadError ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-muted-foreground/20 bg-muted/40 px-4 py-3 text-sm">
            <Icons.Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
              <span>No valuation snapshot yet\u2014the last costing run hasn&apos;t been saved. Run costing so amounts appear here.</span>
              <Button asChild size="sm" variant="secondary">
                <Link href="/inventory/costing">Go to costing</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Valuation layers</CardTitle>
                <CardDescription className="space-y-1 max-w-3xl">
                  {ranAt ? (
                    <>
                      <span className="block">
                        Same snapshot as Inventory costing (one line per product \u00d7 warehouse stock level). Run{" "}
                        <strong className="font-medium">Run costing</strong> there to refresh\u2014including after new receipts
                        or other-cost allocations. Not an independent \u201clive\u201d feed.
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        Snapshot: {method ?? "\u2014"} \u00b7 {new Date(ranAt).toLocaleString()}. Extra SKUs appear when that
                        product has on-hand quantity in Stock levels under a warehouse when costing runs.
                      </span>
                    </>
                  ) : (
                    <span className="block">Latest persisted valuation from the backend costing snapshot.</span>
                  )}
                </CardDescription>
              </div>
              {!loading && (totalCount > 0 || summary.length > 0) ? (
                <div className="text-right text-sm tabular-nums">
                  <div className="text-muted-foreground">Total inventory value (this snapshot)</div>
                  <div className="text-lg font-semibold">{totalDisplayValue.toLocaleString()}</div>
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
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {s.skuCount} SKU \u00b7 qty {s.totalQty.toLocaleString()} \u00b7{" "}
                      <span className="text-foreground">{s.totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : null}
          <CardContent className="p-0">
            <DataTable data={valuationRows} columns={columns} emptyMessage={emptyMessage}
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
          entityLabel="valuation rows"
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
                      Franchise network \u2014 stock at outlets
                    </CardTitle>
                    <CardDescription className="space-y-1 max-w-3xl">
                      <span className="block">
                        Per-SKU quantities currently held across all active franchise outlets, valued at the latest
                        HQ unit cost from the costing snapshot.{" "}
                        <strong className="font-medium">Management figure only</strong> \u2014 under the intercompany sale
                        model, HQ recognized revenue and COGS when goods were invoiced to the franchise; this stock
                        is on the franchisee&apos;s balance sheet and does not form part of HQ general-ledger inventory.
                      </span>
                      {franchiseCostingRanAt && (
                        <span className="block text-xs text-muted-foreground">
                          Unit costs from costing snapshot: {new Date(franchiseCostingRanAt).toLocaleString()}.
                          Products without a costing run show zero value.
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {!franchiseLoading && frTotalCount > 0 && (
                    <div className="text-right text-sm tabular-nums">
                      <div className="text-muted-foreground">Network total available qty</div>
                      <div className="text-lg font-semibold">{franchiseTotalQty.toLocaleString()}</div>
                      {franchiseTotalValue > 0 && (
                        <>
                          <div className="text-muted-foreground mt-1">at HQ cost (KES)</div>
                          <div className="text-base font-semibold">
                            {Math.round(franchiseTotalValue).toLocaleString()}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {franchiseLoading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Loading franchise stock\u2026
                  </div>
                ) : frTotalCount === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No franchise stock found. Outlets must have posted GRNs to show stock here.
                  </div>
                ) : (
                  <DataTable
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
                entityLabel="franchise stock rows"
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
