"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/analytics";
import { fetchInventoryValuation } from "@/lib/api/inventory-costing";
import { fetchDiscountPolicies, fetchPriceListsApi } from "@/lib/api/pricing";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AnalyticsPricingPage() {
  const [leakageRows, setLeakageRows] = React.useState<
    Array<{ sku: string; listPrice: number; realizedPrice: number; leakagePct: number }>
  >([]);
  const [integrityRows, setIntegrityRows] = React.useState<
    Array<{ sku: string; issue: "ok" | "warning"; detail: string }>
  >([]);
  const [lossRows, setLossRows] = React.useState<Array<{ sku: string; margin: number; listPrice: number; unitCost: number }>>([]);

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchPriceListsApi(), fetchInventoryValuation(), fetchDiscountPolicies()])
      .then(([priceLists, valuation, policies]) => {
        if (cancelled) return;
        const mainPriceList = priceLists[0];
        const priceByProduct = new Map((mainPriceList?.items ?? []).map((item) => [item.productId, item.price]));
        const valuationRows = valuation.rows ?? [];
        const leakage = valuationRows
          .filter((row) => priceByProduct.has(row.productId))
          .map((row) => {
            const listPrice = priceByProduct.get(row.productId) ?? 0;
            const leakagePct = listPrice > 0 ? Math.round(((listPrice - row.unitCost) / listPrice) * 1000) / 10 : 0;
            return {
              sku: row.sku,
              listPrice,
              realizedPrice: row.unitCost,
              leakagePct,
            };
          })
          .sort((a, b) => b.leakagePct - a.leakagePct)
          .slice(0, 12);
        setLeakageRows(leakage);

        const integrity = policies.map((policy) => {
          const issue: "ok" | "warning" = policy.enabled ? "ok" : "warning";
          const detail = policy.enabled
            ? `Priority ${policy.priority} with ${policy.discountPercent ?? 0}% discount`
            : "Policy is disabled";
          return {
            sku: policy.name,
            issue,
            detail,
          };
        });
        setIntegrityRows(integrity);

        const losses = valuationRows
          .filter((row) => priceByProduct.has(row.productId))
          .map((row) => {
            const listPrice = priceByProduct.get(row.productId) ?? 0;
            const margin = listPrice - row.unitCost;
            return { sku: row.sku, margin, listPrice, unitCost: row.unitCost };
          })
          .filter((row) => row.margin < 0)
          .sort((a, b) => a.margin - b.margin)
          .slice(0, 10);
        setLossRows(losses);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load pricing analytics.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Pricing intelligence"
        description="Price leakage, tier integrity, loss-making SKUs"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Pricing" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/products/pricing-rules">Pricing rules</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <InsightCard
          title="Price leakage detection"
          description="List vs realized price; leakage %"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/master/products/p1/pricing">Fix pricing</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">SKU</th>
                  <th className="text-right font-medium px-3 py-2">List</th>
                  <th className="text-right font-medium px-3 py-2">Realized</th>
                  <th className="text-right font-medium px-3 py-2">Leakage %</th>
                </tr>
              </thead>
              <tbody>
                {leakageRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.listPrice, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.realizedPrice, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2 text-amber-600">{r.leakagePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leakageRows.length === 0 && <p className="p-3 text-sm text-muted-foreground">No leakage signals available yet.</p>}
          </div>
        </InsightCard>

        <InsightCard
          title="Tier integrity checks"
          description="Inversions, gaps"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/settings/products/pricing-rules">Create price approval rule</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">SKU</th>
                  <th className="text-left font-medium px-3 py-2">Issue</th>
                  <th className="text-left font-medium px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {integrityRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.issue === "ok" ? "secondary" : "destructive"}>
                        {r.issue}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {integrityRows.length === 0 && <p className="p-3 text-sm text-muted-foreground">No pricing policies found.</p>}
          </div>
        </InsightCard>

        <InsightCard
          title="Loss-making SKUs"
          description="Products where list price is below unit cost"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/master/products">Flag loss-making SKUs</Link>
            </Button>
          }
        >
          {lossRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No loss-making SKUs detected from current price list and valuation.</p>
          ) : (
            <div className="space-y-2">
              {lossRows.map((row) => (
                <p key={row.sku} className="text-sm text-muted-foreground">
                  {row.sku}: list {formatMoney(row.listPrice, "KES")} vs cost {formatMoney(row.unitCost, "KES")} (margin {formatMoney(row.margin, "KES")})
                </p>
              ))}
            </div>
          )}
        </InsightCard>
      </div>
    </PageShell>
  );
}
