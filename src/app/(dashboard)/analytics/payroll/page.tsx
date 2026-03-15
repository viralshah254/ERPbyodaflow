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

export default function AnalyticsPayrollPage() {
  const [insights, setInsights] = React.useState<Awaited<ReturnType<typeof fetchAnalyticsInsights>> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetchAnalyticsInsights("payroll")
      .then((items) => {
        if (!cancelled) setInsights(items);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load payroll analytics.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = insights?.data ?? [];
  const totalLabor = rows.reduce((sum, item) => sum + (item.totalNet ?? 0), 0);
  const runCount = rows.length;

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
          <InsightCard title="Approved runs awaiting post" variant="muted">
            <KpiHero value={runCount} format="number" label="Ready for journal posting" />
          </InsightCard>
        </div>

        <InsightCard
          title="Pay runs ready to post"
          description="Live approved payroll runs surfaced by analytics"
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
                  <th className="text-left font-medium px-3 py-2">Pay run</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                  <th className="text-right font-medium px-3 py-2">Open action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{r.number}</td>
                    <td className="text-right tabular-nums px-3 py-2">{formatMoney(r.totalNet ?? 0, "KES")}</td>
                    <td className="text-right tabular-nums px-3 py-2">
                      <Link className="text-primary underline-offset-4 hover:underline" href={r.drillPath ?? "/payroll/pay-runs"}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">No payroll insights right now.</p>}
          </div>
        </InsightCard>

        <InsightCard
          title="Payroll posting queue"
          description="Focus on approved runs before month-end close"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/payroll/statutories">Statutories</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            {rows.length > 0
              ? `Latest approved run ${rows[0]?.number} is waiting for journal posting.`
              : "No approved pay runs are waiting to be posted."}
          </p>
        </InsightCard>

        <InsightCard
          title="Productivity proxy"
          description="Payroll follow-up actions"
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/payroll/employees">Employees</Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">Use employees and pay runs for live payroll operational follow-up.</p>
        </InsightCard>
      </div>
    </PageShell>
  );
}
