"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { InsightCard, KpiHero } from "@/components/analytics";
import {
  MOCK_LABOR_COST_DRIVERS,
  MOCK_OVERTIME_HOTSPOTS,
} from "@/lib/mock/analytics/intelligence";
import { formatMoney } from "@/lib/money";

const totalLabor = MOCK_LABOR_COST_DRIVERS.reduce((s, r) => s + r.amount, 0);
const overtimeTotal = MOCK_OVERTIME_HOTSPOTS.reduce((s, r) => s + r.cost, 0);

export default function AnalyticsPayrollPage() {
  return (
    <PageShell>
      <PageHeader
        title="Payroll intelligence"
        description="Labor cost drivers, overtime hotspots, cost per branch, productivity proxy"
        breadcrumbs={[{ label: "Analytics", href: "/analytics" }, { label: "Payroll" }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/payroll/overview">Payroll</Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard title="Total labor cost" variant="muted">
            <KpiHero value={totalLabor} format="currency" label="This period" />
          </InsightCard>
          <InsightCard title="Overtime cost" variant="muted">
            <KpiHero value={overtimeTotal} format="currency" label="Overtime only" />
          </InsightCard>
        </div>

        <InsightCard
          title="Labor cost drivers"
          description="Base, overtime, allowances, statutory"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/payroll/pay-runs">Pay runs</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Driver</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                  <th className="text-right font-medium px-3 py-2">% of total</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_LABOR_COST_DRIVERS.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.driver}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.amount, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.pctOfTotal}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="Overtime hotspots"
          description="Cost per branch / department"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/payroll/statutories">Statutories</Link>
            </Button>
          }
        >
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-3 py-2">Branch</th>
                  <th className="text-left font-medium px-3 py-2">Department</th>
                  <th className="text-right font-medium px-3 py-2">Hours</th>
                  <th className="text-right font-medium px-3 py-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_OVERTIME_HOTSPOTS.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.branch}</td>
                    <td className="px-3 py-2">{r.department}</td>
                    <td className="text-right tabular-nums px-3 py-2">{r.hours}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.cost, "KES")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InsightCard>

        <InsightCard
          title="Productivity proxy"
          description="Cost per branch / department (stub)"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/payroll/employees">Employees</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Productivity proxy. Use Explore for payroll_cost by employee, branch.</p>
        </InsightCard>
      </div>
    </PageShell>
  );
}
