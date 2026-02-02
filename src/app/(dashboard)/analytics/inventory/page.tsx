"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/analytics";
import {
  MOCK_STOCKOUT_CAUSE,
  MOCK_DEAD_STOCK,
  MOCK_SHRINKAGE_VARIANCE,
} from "@/lib/mock/analytics/intelligence";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

const CAUSE_LABELS: Record<string, string> = {
  demand_spike: "Demand spike",
  replenishment_delay: "Replenishment delay",
  supplier: "Supplier",
  other: "Other",
};

export default function AnalyticsInventoryPage() {
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
          title="Stockout root cause"
          description="Why stockouts occurred"
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
                  <th className="text-left font-medium px-3 py-2">SKU</th>
                  <th className="text-left font-medium px-3 py-2">Cause</th>
                  <th className="text-right font-medium px-3 py-2">Days out</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_STOCKOUT_CAUSE.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{CAUSE_LABELS[r.cause] ?? r.cause}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.daysOut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="Dead stock"
          description="Value and days since movement"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/inventory/stock-levels">Review</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">SKU</th>
                  <th className="text-right font-medium px-3 py-2">Value</th>
                  <th className="text-right font-medium px-3 py-2">Days since movement</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DEAD_STOCK.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.value, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.daysSinceMovement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="Shrinkage variance"
          description="Expected vs actual by period"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/warehouse/cycle-counts">Cycle counts</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Period</th>
                  <th className="text-right font-medium px-3 py-2">Expected</th>
                  <th className="text-right font-medium px-3 py-2">Actual</th>
                  <th className="text-right font-medium px-3 py-2">Variance %</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SHRINKAGE_VARIANCE.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.period}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.expected, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.actual, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">
                      <Badge variant={r.variancePct > 0 ? "destructive" : "secondary"}>
                        {r.variancePct > 0 ? "+" : ""}{r.variancePct}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="Reorder health"
          description="Landed cost impact (stub)"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/inventory/costing">Costing</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Reorder point coverage and landed cost impact. Run in Explore.</p>
        </InsightCard>
      </div>
    </PageShell>
  );
}
