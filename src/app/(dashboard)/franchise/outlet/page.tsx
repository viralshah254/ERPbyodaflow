"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { fetchFranchiseOutletWorkspace } from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  PackageSearch,
  FileText,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  Truck,
  ArrowRight,
} from "lucide-react";

interface ActionTileProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  highlight?: boolean;
}

function ActionTile({ href, icon, label, sublabel, highlight }: ActionTileProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center transition-colors hover:bg-accent hover:text-accent-foreground ${highlight ? "border-primary bg-primary/5" : "bg-card"}`}
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </div>
      <div>
        <p className="text-base font-semibold leading-tight">{label}</p>
        {sublabel && <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </Link>
  );
}

export default function FranchiseOutletWorkspacePage() {
  const [workspace, setWorkspace] = React.useState<Awaited<ReturnType<typeof fetchFranchiseOutletWorkspace>> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchFranchiseOutletWorkspace()
      .then((payload) => { if (active) setWorkspace(payload); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="My Outlet"
        description="Everything you need to sell, order, and manage your stock — in one place."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/outlet" }, { label: "Outlet Workspace" }]}
        sticky
        showCommandHint
      />
      <div className="space-y-6 p-4 sm:p-6">
        {/* Prominent stock request CTA */}
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <div>
            <p className="font-semibold text-sm">Need to restock?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Request stock from HQ — your order is sent straight to Cool Catch for fulfilment.</p>
          </div>
          <Button asChild size="sm" className="shrink-0 ml-4">
            <Link href="/docs/purchase-request/new">
              Request stock from HQ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* KPI snapshot */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalKpiCard
            title="Sales Today"
            value={formatMoney(workspace?.salesToday ?? 0, "KES")}
            subtitle="Invoiced today"
          />
          <OperationalKpiCard
            title="Sales This Month"
            value={formatMoney(workspace?.monthlySales ?? 0, "KES")}
            subtitle="Month-to-date invoices"
          />
          <OperationalKpiCard
            title="Open Orders"
            value={workspace?.openSalesOrders ?? 0}
            subtitle="Awaiting delivery or close-out"
          />
          <OperationalKpiCard
            title="Low Stock"
            value={workspace?.lowStockCount ?? 0}
            subtitle="Items running low"
            severity={(workspace?.lowStockCount ?? 0) > 0 ? "warning" : "default"}
          />
        </div>

        {/* Primary quick-actions */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <ActionTile
              href="/docs/sales-order/new"
              icon={<ShoppingCart className="h-7 w-7" />}
              label="New Sale"
              sublabel="Record a customer order"
              highlight
            />
            <ActionTile
              href="/docs/invoice/new"
              icon={<FileText className="h-7 w-7" />}
              label="New Invoice"
              sublabel="Bill a customer"
            />
            <ActionTile
              href="/docs/purchase-request/new"
              icon={<Truck className="h-7 w-7" />}
              label="Request Stock from HQ"
              sublabel="Order replenishment from Cool Catch"
              highlight
            />
            <ActionTile
              href="/inventory/stock-levels"
              icon={<PackageSearch className="h-7 w-7" />}
              label="My Stock"
              sublabel="Check current stock levels"
            />
            <ActionTile
              href="/docs/purchase-request/new"
              icon={<ClipboardList className="h-7 w-7" />}
              label="Stock Request"
              sublabel="Raise a replenishment request"
            />
            <ActionTile
              href="/docs/delivery/new"
              icon={<Truck className="h-7 w-7" />}
              label="Record Delivery"
              sublabel="Goods received from HQ"
            />
            <ActionTile
              href="/franchise/commission"
              icon={<TrendingUp className="h-7 w-7" />}
              label="Commission"
              sublabel="View your statement"
            />
            <ActionTile
              href="/ar/payments"
              icon={<FileText className="h-7 w-7" />}
              label="Customer Receipts"
              sublabel="Record payments received"
            />
          </div>
        </div>

        {/* Recent activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (workspace?.recentInvoices.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet. Create your first sale above.</p>
              ) : (
                workspace?.recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">{invoice.date} · {invoice.status}</p>
                    </div>
                    <span className="font-semibold">{formatMoney(invoice.total, "KES")}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {(workspace?.lowStockCount ?? 0) > 0 && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                Low Stock Watchlist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (workspace?.lowStockItems.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">All stock levels look good.</p>
              ) : (
                workspace?.lowStockItems.map((item, index) => (
                  <div
                    key={`${item.productId}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/30"
                  >
                    <div>
                      <p className="font-medium">{item.productName ?? item.productId}</p>
                      <p className="text-xs text-muted-foreground">{item.warehouseName ?? item.warehouseId}</p>
                    </div>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {item.quantity} {item.uom ?? "units"}
                    </span>
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
