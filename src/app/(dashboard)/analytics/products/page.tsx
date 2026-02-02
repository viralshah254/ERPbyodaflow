"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InsightCard } from "@/components/analytics";
import {
  MOCK_MARGIN_WATERFALL,
  MOCK_PACKAGING_PROFIT,
  MOCK_CHANNEL_MARGIN,
} from "@/lib/mock/analytics/intelligence";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

export default function AnalyticsProductsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Product intelligence"
        description="Margin waterfall, packaging profitability, channel margin"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Products" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/master/products">Products</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <InsightCard
          title="Margin waterfall"
          description="List → discount → net → cost → margin"
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
                  <th className="text-left font-medium px-3 py-2">Stage</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                  <th className="text-right font-medium px-3 py-2">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_MARGIN_WATERFALL.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.stage}</td>
                    <td className="text-right tabular-nums px-3 py-2">
                      {r.amount !== 0 ? (r.amount >= 0 ? "" : "-") + formatMoney(Math.abs(r.amount), "KES") : "—"}
                    </td>
                    <td className="text-right tabular-nums font-medium px-3 py-2">
                      {formatMoney(r.cumulative, "KES")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="Packaging profitability (EA vs CTN vs BDL)"
          description="Margin % and volume by UOM"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/master/products/p1/packaging">Packaging</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">SKU</th>
                  <th className="text-left font-medium px-3 py-2">UOM</th>
                  <th className="text-right font-medium px-3 py-2">Margin %</th>
                  <th className="text-right font-medium px-3 py-2">Volume</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PACKAGING_PROFIT.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.uom}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.marginPct}%</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="Channel margin comparison"
          description="Revenue, COGS, margin % by channel"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/analytics/explore">Explore</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Channel</th>
                  <th className="text-right font-medium px-3 py-2">Revenue</th>
                  <th className="text-right font-medium px-3 py-2">COGS</th>
                  <th className="text-right font-medium px-3 py-2">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CHANNEL_MARGIN.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.channel}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.revenue, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.cogs, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.marginPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>
      </div>
    </PageShell>
  );
}
