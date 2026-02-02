"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/analytics";
import {
  MOCK_PRICE_LEAKAGE,
  MOCK_TIER_INTEGRITY,
} from "@/lib/mock/analytics/intelligence";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPricingPage() {
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
                {MOCK_PRICE_LEAKAGE.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.listPrice, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.realizedPrice, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2 text-amber-600">{r.leakagePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                {MOCK_TIER_INTEGRITY.map((r, i) => (
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
          </div>
        </InsightCard>

        <InsightCard
          title="Loss-making SKUs"
          description="Flag loss-making SKUs (stub list)"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/master/products">Flag loss-making SKUs</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">No loss-making SKUs in current period. Run margin report in Explore.</p>
        </InsightCard>
      </div>
    </PageShell>
  );
}
