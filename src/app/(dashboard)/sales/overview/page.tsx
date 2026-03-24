"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import { fetchSalesDocumentsApi } from "@/lib/api/sales-docs";
import type { SalesDocRow } from "@/lib/types/sales";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { apiRequest, isApiConfigured } from "@/lib/api/client";
import { formatMoney } from "@/lib/money";
import { convertDocumentApi } from "@/lib/api/documents";
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
  arTotal: number;
  arInvoiceCount: number;
  topCustomer: string | null;
  recentOrders: SalesDocRow[];
  pipelineStages: { stage: string; count: number; value: number }[];
};

export default function SalesOverviewPage() {
  const router = useRouter();
  const [kpis, setKpis] = React.useState<KpiData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [convertConfirm, setConvertConfirm] = React.useState<{ id: string; number: string } | null>(null);
  const [converting, setConverting] = React.useState(false);

  React.useEffect(() => {
    if (!isApiConfigured()) return;
    setLoading(true);
    Promise.all([
      fetchSalesDocumentsApi("sales-order").catch(() => [] as SalesDocRow[]),
      apiRequest<{ totalAr: number; invoiceCount: number }>("/api/finance/ar").catch(() => ({ totalAr: 0, invoiceCount: 0 })),
    ]).then(([orders, arData]) => {
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
      // Top customer this month by order value
      const thisMonth = new Date().toISOString().slice(0, 7);
      const byCustomer = new Map<string, number>();
      for (const o of orders) {
        if (o.date?.startsWith(thisMonth) && o.party) {
          byCustomer.set(o.party, (byCustomer.get(o.party) ?? 0) + (o.total ?? 0));
        }
      }
      const topCustomer = byCustomer.size
        ? [...byCustomer.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : null;
      setKpis({
        openOrdersValue: openOrders.reduce((sum, o) => sum + (o.total ?? 0), 0),
        pendingApprovalCount: pendingApproval.length,
        arTotal: arData.totalAr,
        arInvoiceCount: arData.invoiceCount,
        topCustomer,
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Icons.ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Open Orders</p>
              </div>
              <p className="text-2xl font-bold">
                {loading ? "—" : formatMoney(kpis?.openOrdersValue ?? 0, "KES")}
              </p>
              <Link href="/sales/orders" className="text-xs text-primary hover:underline">View orders →</Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Icons.Clock className="h-4 w-4 text-amber-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Approval</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {loading ? "—" : (kpis?.pendingApprovalCount ?? 0)}
              </p>
              <Link href="/sales/orders?status=PENDING_APPROVAL" className="text-xs text-primary hover:underline">Review →</Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Icons.CreditCard className="h-4 w-4 text-red-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Outstanding AR</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {loading ? "—" : formatMoney(kpis?.arTotal ?? 0, "KES")}
              </p>
              {kpis?.arInvoiceCount ? (
                <p className="text-xs text-muted-foreground">{kpis.arInvoiceCount} invoice{kpis.arInvoiceCount !== 1 ? "s" : ""} open</p>
              ) : (
                <Link href="/ar/aging" className="text-xs text-primary hover:underline">View aging →</Link>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <Icons.Star className="h-4 w-4 text-yellow-500" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Top Customer</p>
              </div>
              <p className="text-base font-bold truncate">
                {loading ? "—" : (kpis?.topCustomer ?? "—")}
              </p>
              <p className="text-xs text-muted-foreground">this month</p>
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
                        <td className="px-4 py-2.5">
                          <Link href={`/docs/sales-order/${order.id}`} className="font-medium text-primary hover:underline">
                            {order.number}
                          </Link>
                          <p className="text-xs text-muted-foreground">{order.party ?? "—"}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <DualCurrencyAmount
                            amount={order.total ?? 0}
                            currency={order.currency ?? "KES"}
                            exchangeRate={order.exchangeRate}
                            size="sm"
                          />
                          <div className="mt-0.5">
                            <StatusBadge status={order.status} />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {order.status === "APPROVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setConvertConfirm({ id: order.id, number: order.number })}
                            >
                              <Icons.FileText className="mr-1 h-3 w-3" />
                              Invoice
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Quick Nav */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/docs/sales-order/new">
                    <Icons.Plus className="mr-1.5 h-4 w-4" />
                    New Sales Order
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/sales/orders">
                    <Icons.List className="mr-1.5 h-4 w-4" />
                    View Orders
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/sales/invoices">
                    <Icons.Receipt className="mr-1.5 h-4 w-4" />
                    View Invoices
                  </Link>
                </Button>
              </CardContent>
            </Card>
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
      </div>

      {/* Quick Convert to Invoice confirmation dialog */}
      {convertConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold mb-2">Convert to Invoice</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Convert <strong>{convertConfirm.number}</strong> to an invoice?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConvertConfirm(null)}>Cancel</Button>
              <Button
                disabled={converting}
                onClick={async () => {
                  setConverting(true);
                  try {
                    const created = await convertDocumentApi("sales-order", convertConfirm.id, { targetType: "invoice" });
                    toast.success(`Invoice ${created.number ?? "created"}.`);
                    setConvertConfirm(null);
                    if (created.id) {
                      router.push(`/docs/invoice/${created.id}`);
                    }
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setConverting(false);
                  }
                }}
              >
                <Icons.FileText className="mr-2 h-4 w-4" />
                {converting ? "Creating…" : "Create Invoice"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
