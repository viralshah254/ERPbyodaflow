"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import { fetchSalesDocumentsApi } from "@/lib/api/sales-docs";
import type { SalesDocRow } from "@/lib/types/sales";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { isApiConfigured } from "@/lib/api/client";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

const NAV_LINKS = [
  { href: "/sales/quotes", label: "Quotes", icon: "FileText" as const },
  { href: "/sales/orders", label: "Sales Orders", icon: "ShoppingCart" as const },
  { href: "/sales/deliveries", label: "Deliveries", icon: "Truck" as const },
  { href: "/sales/invoices", label: "Invoices", icon: "Receipt" as const },
];

type KpiData = {
  openOrdersValue: number;
  pendingApprovalCount: number;
  overdueInvoicesTotal: number;
  recentOrders: SalesDocRow[];
  pipelineStages: { stage: string; count: number; value: number }[];
};

export default function SalesOverviewPage() {
  const [kpis, setKpis] = React.useState<KpiData | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isApiConfigured()) return;
    setLoading(true);
    Promise.all([
      fetchSalesDocumentsApi("sales-order").catch(() => [] as SalesDocRow[]),
      fetchSalesDocumentsApi("invoice").catch(() => [] as SalesDocRow[]),
    ]).then(([orders, invoices]) => {
      const openOrders = orders.filter((o) => o.status !== "CANCELLED");
      const pendingApproval = orders.filter((o) => o.status === "PENDING_APPROVAL");
      // Pipeline stages
      const stages = [
        { stage: "Draft", statuses: ["DRAFT"] },
        { stage: "Pending", statuses: ["PENDING_APPROVAL"] },
        { stage: "Approved", statuses: ["APPROVED"] },
        { stage: "Invoiced", statuses: ["FULFILLED", "INVOICED"] },
        { stage: "Paid", statuses: ["PAID"] },
      ];
      const pipelineStages = stages.map((s) => {
        const matches = orders.filter((o) => s.statuses.includes(o.status));
        return {
          stage: s.stage,
          count: matches.length,
          value: matches.reduce((sum, o) => sum + (o.total ?? 0), 0),
        };
      });
      // Overdue invoices (those that are POSTED but not paid, we use them as rough "outstanding")
      const overdueInvoices = invoices.filter((i) => i.status === "POSTED");
      setKpis({
        openOrdersValue: openOrders.reduce((sum, o) => sum + (o.total ?? 0), 0),
        pendingApprovalCount: pendingApproval.length,
        overdueInvoicesTotal: overdueInvoices.reduce((sum, i) => sum + (i.total ?? 0), 0),
        recentOrders: orders.slice(0, 5),
        pipelineStages,
      });
    }).catch((e) => toast.error((e as Error).message))
    .finally(() => setLoading(false));
  }, []);

  const maxPipelineValue = Math.max(...(kpis?.pipelineStages.map((s) => s.value) ?? [1]));

  return (
    <PageShell>
      <PageHeader
        title="Sales"
        description="Pipeline, orders, and collections overview"
        breadcrumbs={[{ label: "Sales" }]}
        sticky
        showCommandHint
        actions={
          <Button asChild>
            <Link href="/docs/sales-order/new">
              <Icons.Plus className="mr-2 h-4 w-4" />
              New Sales Order
            </Link>
          </Button>
        }
      />
      <div className="p-6 space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Open Orders</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? "—" : formatMoney(kpis?.openOrdersValue ?? 0, "KES")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Approval</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">
                {loading ? "—" : (kpis?.pendingApprovalCount ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding AR</p>
              <p className="text-2xl font-bold mt-1 text-red-600">
                {loading ? "—" : formatMoney(kpis?.overdueInvoicesTotal ?? 0, "KES")}
              </p>
              <Link href="/ar/aging" className="text-xs text-primary hover:underline">View aging →</Link>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel */}
        {kpis && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icons.TrendingUp className="h-4 w-4" />
                Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                {kpis.pipelineStages.map((stage) => (
                  <div key={stage.stage} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-xs font-medium text-muted-foreground">{stage.count}</p>
                    <div
                      className="w-full rounded-t bg-primary/20 hover:bg-primary/30 transition-colors"
                      style={{ height: `${Math.max(8, (stage.value / maxPipelineValue) * 80)}px` }}
                      title={`${stage.stage}: ${formatMoney(stage.value, "KES")}`}
                    />
                    <p className="text-[10px] text-muted-foreground text-center">{stage.stage}</p>
                    <p className="text-[10px] text-muted-foreground">{formatMoney(stage.value, "KES")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Recent orders</CardTitle>
              <Link href="/sales/orders" className="text-xs text-primary hover:underline">View all →</Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : !kpis?.recentOrders.length ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No orders yet</div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {kpis.recentOrders.map((order) => (
                      <tr key={order.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-2">
                          <Link href={`/docs/sales-order/${order.id}`} className="font-medium text-primary hover:underline">
                            {order.number}
                          </Link>
                          <p className="text-xs text-muted-foreground">{order.party ?? "—"}</p>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <DualCurrencyAmount
                            amount={order.total ?? 0}
                            currency={order.currency ?? "KES"}
                            exchangeRate={order.exchangeRate}
                            size="sm"
                          />
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Quick Nav */}
          <div className="grid grid-cols-2 gap-3">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const Icon = (Icons[icon] || Icons.FileText) as React.ComponentType<{ className?: string }>;
              return (
                <Link key={href} href={href}>
                  <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="pt-4 flex flex-col items-center text-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-sm font-medium">{label}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
