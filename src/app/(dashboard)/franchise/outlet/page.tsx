"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { fetchFranchiseOutletWorkspace } from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";

export default function FranchiseOutletWorkspacePage() {
  const [workspace, setWorkspace] = React.useState<Awaited<ReturnType<typeof fetchFranchiseOutletWorkspace>> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchFranchiseOutletWorkspace()
      .then((payload) => {
        if (active) setWorkspace(payload);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Outlet Workspace"
        description="Lightweight ERP workspace for franchise operations, stock, selling, and settlement visibility."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/outlet" }, { label: "Outlet Workspace" }]}
        sticky
        showCommandHint
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalKpiCard title="Sales Today" value={formatMoney(workspace?.salesToday ?? 0, "KES")} subtitle="Posted invoices for today" />
          <OperationalKpiCard title="Sales MTD" value={formatMoney(workspace?.monthlySales ?? 0, "KES")} subtitle="Current invoice value visible to outlet" />
          <OperationalKpiCard title="Open Orders" value={workspace?.openSalesOrders ?? 0} subtitle="Sales orders awaiting close-out" />
          <OperationalKpiCard title="Low Stock Alerts" value={workspace?.lowStockCount ?? 0} subtitle="SKU positions below operating threshold" severity={(workspace?.lowStockCount ?? 0) > 0 ? "warning" : "default"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Sell</CardTitle>
              <CardDescription>Create commercial documents and follow customer activity.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild><Link href="/docs/quote/new">New Quote</Link></Button>
              <Button variant="outline" asChild><Link href="/docs/sales-order/new">New Sales Order</Link></Button>
              <Button variant="outline" asChild><Link href="/docs/invoice/new">New Invoice</Link></Button>
              <Button variant="outline" asChild><Link href="/ar/payments">Customer Receipts</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Operate</CardTitle>
              <CardDescription>Check stock, receipts, and warehouse execution.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild><Link href="/inventory/stock-levels">Stock Levels</Link></Button>
              <Button variant="outline" asChild><Link href="/inventory/receipts">Receipts</Link></Button>
              <Button variant="outline" asChild><Link href="/warehouse/pick-pack">Pick & Pack</Link></Button>
              <Button variant="outline" asChild><Link href="/warehouse/putaway">Putaway</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Settle</CardTitle>
              <CardDescription>Monitor payables, bills, and franchise statement readiness.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild><Link href="/docs/bill/new">New Bill</Link></Button>
              <Button variant="outline" asChild><Link href="/ap/payments">Supplier Payments</Link></Button>
              <Button variant="outline" asChild><Link href="/franchise/commission">Commission Statement</Link></Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Most recent posted sales visible to this outlet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading outlet workspace…</p>
              ) : (workspace?.recentInvoices.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No recent invoices yet.</p>
              ) : (
                workspace?.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{invoice.number}</p>
                      <p className="text-muted-foreground">{invoice.date} · {invoice.status}</p>
                    </div>
                    <span>{formatMoney(invoice.total, "KES")}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low stock watchlist</CardTitle>
              <CardDescription>SKU positions that need action from the outlet or franchisor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading stock watchlist…</p>
              ) : (workspace?.lowStockItems.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No low stock items right now.</p>
              ) : (
                workspace?.lowStockItems.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{item.productId}</p>
                      <p className="text-muted-foreground">{item.warehouseId}</p>
                    </div>
                    <span>{item.quantity}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
