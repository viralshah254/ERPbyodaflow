"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InsightCard, KpiHero } from "@/components/analytics";
import { formatMoney } from "@/lib/money";

/** Mock simulation: sliders + instant recalculation. */

export default function AnalyticsSimulationsPage() {
  const [priceTier, setPriceTier] = React.useState(0);
  const [reorder, setReorder] = React.useState(0);
  const [payroll, setPayroll] = React.useState(0);
  const [fx, setFx] = React.useState(0);

  const marginImpact = 2.1 * (priceTier / 5);
  const revenueImpactPct = 4.3 * (priceTier / 5);
  const stockoutImpact = reorder <= 0 ? 0 : Math.min(15, reorder * 2);
  const cashImpactReorder = reorder * -8000;
  const cashImpactPayroll = payroll * -18000;
  const costImpactFx = fx * 12000;

  return (
    <PageShell>
      <PageHeader
        title="Simulation lab"
        description="Sliders + instant mock recalculation"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Simulations" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics/insights">Insights</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <InsightCard
          title="Change price tiers → margin impact"
          description="Simulate +X% across tiers"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/master/products/p1/pricing">Pricing</Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Price tier change %</Label>
              <input
                type="range"
                min={-10}
                max={10}
                step={1}
                value={priceTier}
                onChange={(e) => setPriceTier(Number(e.target.value))}
                className="w-full h-2 accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                {priceTier > 0 ? "+" : ""}{priceTier}%
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <KpiHero
                value={marginImpact}
                format="number"
                label="Margin impact (pts)"
              />
              <KpiHero
                value={revenueImpactPct}
                format="percent"
                label="Revenue impact"
              />
            </div>
          </div>
        </InsightCard>

        <InsightCard
          title="Change reorder points → cash & stockout impact"
          description="Higher reorder = more stock, less stockout; cash tied up"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/inventory/stock-levels">Stock</Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reorder points change %</Label>
              <input
                type="range"
                min={-20}
                max={20}
                step={2}
                value={reorder}
                onChange={(e) => setReorder(Number(e.target.value))}
                className="w-full h-2 accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                {reorder > 0 ? "+" : ""}{reorder}%
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <KpiHero
                value={stockoutImpact}
                format="number"
                label="Stockout days impact (est.)"
              />
              <KpiHero
                value={cashImpactReorder}
                format="currency"
                label="Cash impact (KES)"
              />
            </div>
          </div>
        </InsightCard>

        <InsightCard
          title="Payroll increase → cash impact"
          description="Simulate X% payroll increase"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/payroll/pay-runs">Pay runs</Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payroll increase %</Label>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={payroll}
                onChange={(e) => setPayroll(Number(e.target.value))}
                className="w-full h-2 accent-primary"
              />
              <p className="text-xs text-muted-foreground">+{payroll}%</p>
            </div>
            <KpiHero
              value={cashImpactPayroll}
              format="currency"
              label="Monthly cash impact (KES)"
            />
          </div>
        </InsightCard>

        <InsightCard
          title="FX movement → cost impact"
          description="Simulate USD appreciation vs KES"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/settings/financial/exchange-rates">Rates</Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>FX move (USD +X% vs KES)</Label>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.5}
                value={fx}
                onChange={(e) => setFx(Number(e.target.value))}
                className="w-full h-2 accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                {fx > 0 ? "+" : ""}{fx}%
              </p>
            </div>
            <KpiHero
              value={costImpactFx}
              format="currency"
              label="Cost impact (KES, USD-denominated)"
            />
          </div>
        </InsightCard>
      </div>
    </PageShell>
  );
}
