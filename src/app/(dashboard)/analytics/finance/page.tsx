"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InsightCard, KpiHero } from "@/components/analytics";
import {
  MOCK_CASH_DRIVERS,
  MOCK_AR_AGING,
} from "@/lib/mock/analytics/intelligence";
import { formatMoney } from "@/lib/money";

export default function AnalyticsFinancePage() {
  const totalAR = MOCK_AR_AGING.reduce((s, r) => s + r.amount, 0);
  const overdue = MOCK_AR_AGING.filter((r) => r.bucket !== "current").reduce((s, r) => s + r.amount, 0);

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
          title="Cash driver tree"
          description="Key drivers and change %"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/treasury/cashflow">Cashflow</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Driver</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                  <th className="text-right font-medium px-3 py-2">Change %</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CASH_DRIVERS.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.driver}</td>
                    <td className="text-right tabular-nums px-3 py-2">
                      {r.amount >= 0 ? "" : "-"}
                      {formatMoney(Math.abs(r.amount), "KES")}
                    </td>
                    <td className="text-right tabular-nums px-3 py-2">
                      {r.changePct >= 0 ? "+" : ""}{r.changePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="AR aging drivers"
          description="Current, 1–30, 31–60, 61–90, 90+"
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
                  <th className="text-left font-medium px-3 py-2">Bucket</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                  <th className="text-right font-medium px-3 py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_AR_AGING.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.bucket}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.amount, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="FX impact & tax burden"
          description="FX impact visualization, tax burden (stub)"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/reports/vat-summary">VAT summary</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">FX impact and tax burden. Use Explore for vat, wht, fx_impact metrics.</p>
        </InsightCard>
      </div>
    </PageShell>
  );
}
