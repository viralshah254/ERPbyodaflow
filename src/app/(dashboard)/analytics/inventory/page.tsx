"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InsightCard } from "@/components/analytics";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableLinearProgress } from "@/components/ui/table-linear-progress";
import { fetchAnalyticsInsights, fetchLowStockAlertsApi, type LowStockAlertRow } from "@/lib/api/analytics";
import { fetchInventoryValuation } from "@/lib/api/inventory-costing";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const LOW_STOCK_PAGE_SIZES = [20, 25, 30, 50];

export default function AnalyticsInventoryPage() {
  const [insights, setInsights] = React.useState<Awaited<ReturnType<typeof fetchAnalyticsInsights>> | null>(null);
  const [valuation, setValuation] = React.useState<Awaited<ReturnType<typeof fetchInventoryValuation>> | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  const [pageSizeOptions, setPageSizeOptions] = React.useState<number[]>(LOW_STOCK_PAGE_SIZES);
  const [lowStock, setLowStock] = React.useState<LowStockAlertRow[]>([]);
  const [lowStockTotal, setLowStockTotal] = React.useState<number | undefined>(undefined);
  const [lowStockHasMore, setLowStockHasMore] = React.useState(false);
  const [lowStockLoading, setLowStockLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchAnalyticsInsights("inventory"), fetchInventoryValuation()])
      .then(([insightItems, valuationItems]) => {
        if (!cancelled) {
          setInsights(insightItems);
          setValuation(valuationItems);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load inventory analytics.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const appliedSearch = React.useRef(search);
  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      if (appliedSearch.current === next) return;
      appliedSearch.current = next;
      setSearch(next);
      setPageOffset(0);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  React.useEffect(() => {
    let cancelled = false;
    setLowStockLoading(true);
    void fetchLowStockAlertsApi({
      search: search || undefined,
      limit: pageSize,
      offset: pageOffset,
    })
      .then((page) => {
        if (cancelled) return;
        setLowStock(page.items);
        setLowStockHasMore(page.hasMore);
        setLowStockTotal(page.totalCount);
        if (page.pageSizeOptions.length > 0) setPageSizeOptions(page.pageSizeOptions);
      })
      .catch((error) => {
        if (cancelled) return;
        setLowStock([]);
        setLowStockHasMore(false);
        setLowStockTotal(0);
        toast.error(error instanceof Error ? error.message : "Failed to load low stock alerts.");
      })
      .finally(() => {
        if (!cancelled) setLowStockLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, pageOffset, pageSize]);

  return (
    <PageShell>
      <PageHeader
        title="Inventory intelligence"
        description="Stockout root cause, dead stock, shrinkage, reorder health"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Inventory" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/stock-levels">Stock levels</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <InsightCard
          title="Low stock alerts"
          description="Live low-stock and replenishment risk insights"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/inventory/stock-levels">View stock</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name or barcode"
              aria-label="Search low stock by name or barcode"
            />
            <div className="relative rounded-md border overflow-hidden">
              <TableLinearProgress active={lowStockLoading} />
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left font-medium px-3 py-2">Product</th>
                    <th className="text-left font-medium px-3 py-2">Warehouse</th>
                    <th className="text-right font-medium px-3 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((row, index) => {
                    const productLabel = row.productName || row.barcode || "Unknown product";
                    const productHref = row.productId
                      ? `/master/products/${encodeURIComponent(row.productId)}`
                      : null;
                    return (
                      <tr key={`${row.productId}-${row.warehouseId}-${index}`} className="border-t">
                        <td className="px-3 py-2">
                          {productHref ? (
                            <Link
                              href={productHref}
                              className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {productLabel}
                            </Link>
                          ) : (
                            productLabel
                          )}
                          {row.barcode && row.productName ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">{row.barcode}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{row.warehouseId}</td>
                        <td className="text-right tabular-nums px-3 py-2">{row.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!lowStockLoading && lowStock.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">
                  {search ? "No products match that name or barcode." : "No inventory alerts right now."}
                </p>
              )}
            </div>
            <TablePagination
              pageOffset={pageOffset}
              pageSize={pageSize}
              itemCount={lowStock.length}
              hasMore={lowStockHasMore}
              totalCount={lowStockTotal}
              loading={lowStockLoading && lowStock.length === 0}
              busy={lowStockLoading && lowStock.length > 0}
              onPrevious={() => setPageOffset((offset) => Math.max(0, offset - pageSize))}
              onNext={() => setPageOffset((offset) => offset + pageSize)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPageOffset(0);
              }}
              pageSizeOptions={pageSizeOptions}
              entityLabel="alerts"
            />
          </div>
        </InsightCard>

        <InsightCard
          title="Warehouse valuation"
          description="Live valuation totals by warehouse"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/inventory/costing">Review</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Warehouse</th>
                  <th className="text-right font-medium px-3 py-2">SKUs</th>
                  <th className="text-right font-medium px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {(valuation?.summary ?? []).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.warehouse}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.skuCount}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.totalValue, "KES")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(valuation?.summary?.length ?? 0) === 0 && <p className="p-3 text-sm text-muted-foreground">No valuation rows yet.</p>}
          </div>
        </InsightCard>

        <InsightCard
          title="Inventory recommendations"
          description="Anomalies and planner recommendations"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/analytics/insights">Open insights</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Title</th>
                  <th className="text-left font-medium px-3 py-2">Summary</th>
                  <th className="text-right font-medium px-3 py-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {(insights?.data ?? []).filter((item) => item.type !== "low_stock").map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.description}</td>
                    <td className="text-right tabular-nums px-3 py-2">
                      <Badge variant={r.severity === "high" || r.severity === "critical" ? "destructive" : "secondary"}>
                        {r.severity ?? "info"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(insights?.data ?? []).filter((item) => item.type !== "low_stock").length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No recommendation items right now.</p>
            )}
          </div>
        </InsightCard>

        <InsightCard
          title="Reorder health"
          description="Current valuation coverage and costing health"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/inventory/costing">Costing</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            {valuation ? `Tracking ${valuation.rows.length} valuation rows across ${valuation.summary.length} warehouses.` : "Loading valuation health..."}
          </p>
        </InsightCard>
      </div>
    </PageShell>
  );
}
