"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";

const HUBS = [
  { href: "/analytics/explore", label: "Explore", desc: "Metric + dimensions. One insight per screen.", icon: "Compass" as const },
  { href: "/analytics/insights", label: "Insights", desc: "AI explanations, forecasts, recommendations.", icon: "Lightbulb" as const },
  { href: "/analytics/anomalies", label: "Anomalies", desc: "Price inversion, margin collapse, shrinkage.", icon: "AlertTriangle" as const },
  { href: "/analytics/simulations", label: "Simulations", desc: "Sliders + what-if. Price, reorder, payroll, FX.", icon: "SlidersHorizontal" as const },
  { href: "/analytics/products", label: "Products", desc: "Margin waterfall, packaging, channel margin.", icon: "Package" as const },
  { href: "/analytics/pricing", label: "Pricing", desc: "Price leakage, tier integrity, loss-making SKUs.", icon: "TrendingUp" as const },
  { href: "/analytics/inventory", label: "Inventory", desc: "Stockout, dead stock, shrinkage, reorder.", icon: "Warehouse" as const },
  { href: "/analytics/finance", label: "Finance", desc: "Cash drivers, AR aging, FX, tax burden.", icon: "Landmark" as const },
  { href: "/analytics/payroll", label: "Payroll", desc: "Labor drivers, overtime, cost per branch.", icon: "CreditCard" as const },
  { href: "/analytics/settings", label: "Settings", desc: "Metrics, dimensions, defaults.", icon: "Settings" as const },
];

export default function AnalyticsHubPage() {
  return (
    <PageShell>
      <PageHeader
        title="Analytics Studio"
        description="Intelligence Operating System — deeper than SAP, more beautiful than Power BI"
        breadcrumbs={[{ label: "Analytics Studio" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {HUBS.map(({ href, label, desc, icon }) => {
            const Icon = (Icons[icon] || Icons.BarChart3) as React.ComponentType<{ className?: string }>;
            return (
              <Link key={href} href={href}>
                <Card className="h-full transition-colors hover:bg-muted/50 hover:border-primary/30">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{label}</CardTitle>
                      <CardDescription>{desc}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Intelligence, not reports
              <Badge variant="secondary">Weeks 2–4</Badge>
            </CardTitle>
            <CardDescription>
              Explorer, visual system, saved views, drill-through. Product, pricing, inventory, finance, payroll intelligence. AI insight cards, anomaly center, simulation lab.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>19 metrics × 15 dimensions — semantic engine</li>
              <li>Explore → MetricPicker, DimensionStack, GlobalFilterBar, InsightCanvas, ExplorerTable, DrillDrawer</li>
              <li>Saved analysis views (localStorage); shareable link stub</li>
              <li>Intelligence modules: products, pricing, inventory, finance, payroll</li>
              <li>Insight cards: Explanation, Forecast, Recommendation, Anomaly, Simulation</li>
              <li>Simulations: price tiers, reorder, payroll, FX — sliders + mock impact</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
