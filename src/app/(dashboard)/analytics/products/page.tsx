"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InsightCard } from "@/components/analytics";
import { fetchProductsApi } from "@/lib/api/products";
import { fetchProductsIntelligenceApi } from "@/lib/api/analytics-intelligence";
import type {
  MarginWaterfallRow,
  PackagingProfitRow,
  ChannelMarginRow,
} from "@/lib/types/analytics-intelligence";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const defaultMarginWaterfall: MarginWaterfallRow[] = [
  { stage: "List", amount: 150000, cumulative: 150000 },
  { stage: "Discount", amount: -12000, cumulative: 138000 },
  { stage: "Net", amount: 0, cumulative: 138000 },
  { stage: "Cost", amount: -82800, cumulative: 55200 },
  { stage: "Margin", amount: 0, cumulative: 55200 },
];
const defaultPackagingProfit: PackagingProfitRow[] = [];
const defaultChannelMargin: ChannelMarginRow[] = [];

export default function AnalyticsProductsPage() {
  const [firstProductId, setFirstProductId] = React.useState<string | null>(null);
  const [marginWaterfall, setMarginWaterfall] = React.useState<MarginWaterfallRow[]>(defaultMarginWaterfall);
  const [packagingProfit, setPackagingProfit] = React.useState<PackagingProfitRow[]>(defaultPackagingProfit);
  const [channelMargin, setChannelMargin] = React.useState<ChannelMarginRow[]>(defaultChannelMargin);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchProductsIntelligenceApi()
      .then((data) => {
        if (!cancelled) {
          setMarginWaterfall(data.marginWaterfall.length ? data.marginWaterfall : defaultMarginWaterfall);
          setPackagingProfit(data.packagingProfit);
          setChannelMargin(data.channelMargin);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMarginWaterfall(defaultMarginWaterfall);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void fetchProductsApi(undefined, "ACTIVE")
      .then((products) => {
        if (!cancelled) setFirstProductId(products[0]?.id ?? null);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load products.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pricingLink = firstProductId ? `/master/products/${firstProductId}/pricing` : "/master/products";
  const packagingLink = firstProductId ? `/master/products/${firstProductId}/packaging` : "/master/products";

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
              <Link href={pricingLink}>Fix pricing</Link>
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
                {marginWaterfall.map((r, i) => (
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
              <Link href={packagingLink}>Packaging</Link>
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
                {packagingProfit.map((r, i) => (
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
                {channelMargin.map((r, i) => (
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
