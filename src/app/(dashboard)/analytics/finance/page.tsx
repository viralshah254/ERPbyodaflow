"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InsightCard, KpiHero } from "@/components/analytics";
import { fetchAnalyticsInsights } from "@/lib/api/analytics";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function AnalyticsFinancePage() {
  const [insights, setInsights] = React.useState<Awaited<ReturnType<typeof fetchAnalyticsInsights>> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetchAnalyticsInsights("finance")
      .then((items) => {
        if (!cancelled) setInsights(items);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load finance analytics.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = insights?.data ?? [];
  const totalAR = rows.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const overdue = totalAR;

  return (
    <PageShell>
      <PageHeader
        title="Finance & cash intelligence"
        description="Cash drivers, AR aging, FX impact, tax burden"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Finance" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/treasury/cashflow">Cashflow</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard title="AR total" variant="muted">
            <KpiHero value={totalAR} format="currency" label="Total receivable" />
          </InsightCard>
          <InsightCard title="Overdue AR" variant="muted">
            <KpiHero value={overdue} format="currency" label="1–30, 31–60, 61–90, 90+" />
          </InsightCard>
        </div>

        <InsightCard
          title="Overdue receivables"
          description="Live overdue posted invoices from finance analytics"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/ar/payments">AR payments</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Invoice</th>
                  <th className="text-left font-medium px-3 py-2">Party</th>
                  <th className="text-left font-medium px-3 py-2">Category</th>
                  <th className="text-left font-medium px-3 py-2">Channel</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                  <th className="text-right font-medium px-3 py-2">Due date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.number}</td>
                    <td className="px-3 py-2">{r.partyName ?? r.partyId ?? "Customer"}</td>
                    <td className="px-3 py-2">{r.customerCategory ?? "—"}</td>
                    <td className="px-3 py-2">{r.channel ?? "—"}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.amount ?? 0, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.dueDate ? String(r.dueDate).slice(0, 10) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">No overdue finance insights right now.</p>}
          </div>
        </InsightCard>

        <InsightCard
          title="Cash collection focus"
          description="Highest-value overdue invoices to resolve first"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/analytics/insights">Open insights</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            {rows.length > 0
              ? `Top overdue invoice is ${rows[0]?.number} for ${formatMoney(rows[0]?.amount ?? 0, "KES")}.`
              : "No overdue invoices are currently surfaced by analytics."}
          </p>
        </InsightCard>

        <InsightCard
          title="FX impact & tax burden"
          description="Finance drill-throughs for tax and treasury"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/reports/vat-summary">VAT summary</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Use VAT summary and cashflow for live tax and treasury follow-up.</p>
        </InsightCard>
      </div>
    </PageShell>
  );
}
