"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { fetchInventoryValuation } from "@/lib/api/inventory-costing";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ValuationRow = {
  sku: string;
  productName: string;
  warehouseName: string;
  unitCost: number;
  stockQty: number;
  stockValue: number;
};

export default function InventoryValuationPage() {
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

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchInventoryValuation()
      .then((payload) => {
        if (cancelled) return;
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
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to load valuation.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalDisplayValue = valuationRows.reduce((s, r) => s + r.stockValue, 0);

  const columns = [
    { id: "sku", header: "SKU", accessor: (r: ValuationRow) => r.sku, sticky: true },
    { id: "name", header: "Product", accessor: (r: ValuationRow) => r.productName },
    { id: "wh", header: "Warehouse", accessor: (r: ValuationRow) => r.warehouseName },
    { id: "unitCost", header: "Unit cost", accessor: (r: ValuationRow) => r.unitCost.toLocaleString() },
    { id: "stock", header: "Stock qty", accessor: (r: ValuationRow) => r.stockQty.toLocaleString() },
    { id: "value", header: "Stock value", accessor: (r: ValuationRow) => r.stockValue.toLocaleString() },
  ];

  const emptyMessage = loading
    ? "Loading valuation..."
    : loadError
      ? "Could not load valuation."
      : ranAt === null && valuationRows.length === 0
        ? "No valuation snapshot yet. Run costing to persist inventory values."
        : "No rows match the current data.";

  return (
    <PageShell>
      <PageHeader
        title="Inventory Valuation"
        description="Latest costing snapshot per SKU and warehouse—run costing to refresh; GL tie-out is done with finance outside this screen."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/costing" }, { label: "Valuation" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-4">
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
              <span>No valuation snapshot yet—the last costing run hasn&apos;t been saved. Run costing so amounts appear here.</span>
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
                        Same snapshot as Inventory costing (one line per product × warehouse stock level). Run{" "}
                        <strong className="font-medium">Run costing</strong> there to refresh—including after new receipts
                        or other-cost allocations. Not an independent “live” feed.
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        Snapshot: {method ?? "—"} · {new Date(ranAt).toLocaleString()}. Extra SKUs appear when that
                        product has on-hand quantity in Stock levels under a warehouse when costing runs.
                      </span>
                    </>
                  ) : (
                    <span className="block">Latest persisted valuation from the backend costing snapshot.</span>
                  )}
                </CardDescription>
              </div>
              {!loading && valuationRows.length > 0 ? (
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
                      {s.skuCount} SKU · qty {s.totalQty.toLocaleString()} ·{" "}
                      <span className="text-foreground">{s.totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : null}
          <CardContent className="p-0">
            <DataTable data={valuationRows} columns={columns} emptyMessage={emptyMessage} />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
