"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/analytics";
import { fetchAnalyticsInsights } from "@/lib/api/analytics";
import { fetchInventoryValuation } from "@/lib/api/inventory-costing";
import { fetchProductApi, fetchProductsPageApi } from "@/lib/api/products";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AnalyticsInventoryPage() {
  const [insights, setInsights] = React.useState<Awaited<ReturnType<typeof fetchAnalyticsInsights>> | null>(null);
  const [valuation, setValuation] = React.useState<Awaited<ReturnType<typeof fetchInventoryValuation>> | null>(null);
  const [productLabels, setProductLabels] = React.useState<Map<string, { name: string; sku?: string }>>(
    () => new Map()
  );
  const [productLabelsReady, setProductLabelsReady] = React.useState(false);

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

  const lowStock = insights?.data.filter((item) => item.type === "low_stock") ?? [];

  React.useEffect(() => {
    const ids = [
      ...new Set(
        (insights?.data ?? [])
          .filter((item) => item.type === "low_stock" && item.productId && !item.productName)
          .map((item) => item.productId as string)
      ),
    ];
    if (ids.length === 0) {
      setProductLabels(new Map());
      setProductLabelsReady(true);
      return;
    }
    setProductLabelsReady(false);
    let cancelled = false;
    void (async () => {
      const labels = new Map<string, { name: string; sku?: string }>();
      try {
        const page = await fetchProductsPageApi({ ids, limit: 100, includeStock: false });
        for (const product of page.items) {
          if (ids.includes(product.id)) {
            labels.set(product.id, { name: product.name, sku: product.sku });
          }
        }
      } catch {
        /* Names are filled from each product below. */
      }
      const missing = ids.filter((id) => !labels.has(id));
      if (missing.length > 0) {
        const rows = await Promise.all(missing.map((id) => fetchProductApi(id).catch(() => null)));
        for (const product of rows) {
          if (product) labels.set(product.id, { name: product.name, sku: product.sku });
        }
      }
      if (!cancelled) {
        setProductLabels(labels);
        setProductLabelsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [insights]);

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
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Product</th>
                  <th className="text-left font-medium px-3 py-2">Warehouse</th>
                  <th className="text-right font-medium px-3 py-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((r, i) => {
                  const lookedUp = r.productId ? productLabels.get(r.productId) : undefined;
                  const productName = r.productName || lookedUp?.name;
                  const productSku = r.productSku || lookedUp?.sku;
                  const waitingForName = Boolean(r.productId && !productName && !productLabelsReady);
                  const productLabel = waitingForName
                    ? "Loading…"
                    : productName || productSku || r.productId || "Unknown product";
                  const productHref = r.productId
                    ? `/master/products/${encodeURIComponent(r.productId)}`
                    : null;
                  return (
                    <tr key={i} className="border-t">
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
                        {productSku && productName ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{productSku}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{r.warehouseId}</td>
                      <td className="text-right tabular-nums px-3 py-2">{r.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lowStock.length === 0 && <p className="p-3 text-sm text-muted-foreground">No inventory alerts right now.</p>}
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
