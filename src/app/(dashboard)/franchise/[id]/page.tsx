"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { fetchFranchiseeStock, fetchFranchiseNetworkOutlets, fetchVMIReplenishmentOrders, fetchTopUps } from "@/lib/api/cool-catch";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { formatMoney } from "@/lib/money";

export default function FranchiseDetailPage() {
  const params = useParams<{ id: string }>();
  const franchiseeId = String(params?.id ?? "");
  const [name, setName] = React.useState(franchiseeId);
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<{ territory?: string; storeFormat?: string; revenue: number; arOverdue: number } | null>(null);
  const [stockRows, setStockRows] = React.useState<Array<{ sku: string; productName: string; qty: number; reorderPoint: number; suggestedOrder: number }>>([]);
  const [replenishments, setReplenishments] = React.useState<Array<{ number: string; status: string; totalQty: number; createdAt: string }>>([]);
  const [topUps, setTopUps] = React.useState<Array<{ runNumber: string; amount: number; reason: string; status: string }>>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchFranchiseNetworkOutlets(),
      fetchFranchiseeStock(franchiseeId),
      fetchVMIReplenishmentOrders({ franchiseeId }),
      fetchTopUps({ franchiseeId }),
    ])
      .then(([outlets, stock, orders, topupRows]) => {
        if (cancelled) return;
        const outlet = outlets.find((item) => item.id === franchiseeId);
        setSummary(
          outlet
            ? {
                territory: outlet.territory,
                storeFormat: outlet.storeFormat,
                revenue: outlet.revenue,
                arOverdue: outlet.arOverdue,
              }
            : null
        );
        setName(stock[0]?.franchiseeName ?? orders[0]?.franchiseeName ?? franchiseeId);
        setStockRows(
          stock.map((s) => ({
            sku: s.sku,
            productName: s.productName,
            qty: s.qty,
            reorderPoint: s.reorderPoint,
            suggestedOrder: s.suggestedOrder,
          }))
        );
        setReplenishments(
          orders.map((o) => ({
            number: o.number,
            status: o.status,
            totalQty: o.totalQty,
            createdAt: o.createdAt,
          }))
        );
        setTopUps(
          topupRows.map((t) => ({
            runNumber: t.runNumber,
            amount: t.amount,
            reason: t.reason,
            status: t.status,
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [franchiseeId]);

  const stockColumns = [
    { id: "sku", header: "SKU", accessor: (r: (typeof stockRows)[number]) => r.sku, sticky: true },
    { id: "product", header: "Product", accessor: (r: (typeof stockRows)[number]) => r.productName },
    { id: "qty", header: "Qty", accessor: (r: (typeof stockRows)[number]) => r.qty },
    { id: "reorder", header: "Reorder point", accessor: (r: (typeof stockRows)[number]) => r.reorderPoint },
    { id: "suggested", header: "Suggested order", accessor: (r: (typeof stockRows)[number]) => r.suggestedOrder },
  ];

  const replenishmentColumns = [
    { id: "number", header: "Order", accessor: (r: (typeof replenishments)[number]) => r.number, sticky: true },
    { id: "status", header: "Status", accessor: (r: (typeof replenishments)[number]) => r.status },
    { id: "qty", header: "Total qty", accessor: (r: (typeof replenishments)[number]) => r.totalQty },
    { id: "createdAt", header: "Created", accessor: (r: (typeof replenishments)[number]) => new Date(r.createdAt).toLocaleDateString() },
  ];

  const topUpColumns = [
    { id: "run", header: "Run", accessor: (r: (typeof topUps)[number]) => r.runNumber, sticky: true },
    { id: "amount", header: "Amount", accessor: (r: (typeof topUps)[number]) => formatMoney(r.amount, "KES") },
    { id: "reason", header: "Reason", accessor: (r: (typeof topUps)[number]) => r.reason },
    { id: "status", header: "Status", accessor: (r: (typeof topUps)[number]) => r.status },
  ];

  return (
    <PageShell>
      <PageHeader
        title={name}
        description={
          summary
            ? `${summary.territory ?? "Territory"} · ${summary.storeFormat ?? "Outlet"} · stock, replenishment, and settlement visibility.`
            : "Franchise profile: stock, replenishment, and top-up history."
        }
        breadcrumbs={[{ label: "Franchise", href: "/franchise/overview" }, { label: name }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/franchise/vmi">Open VMI</Link>
            </Button>
            <Button asChild>
              <Link href="/franchise/commission">Open Commission</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalKpiCard title="Revenue" value={formatMoney(summary?.revenue ?? 0, "KES")} subtitle="Posted invoice value" />
          <OperationalKpiCard title="AR Overdue" value={formatMoney(summary?.arOverdue ?? 0, "KES")} subtitle="Collections pressure" severity={(summary?.arOverdue ?? 0) > 0 ? "warning" : "default"} />
          <OperationalKpiCard title="Active SKUs" value={stockRows.length} subtitle="Tracked outlet stock positions" />
          <OperationalKpiCard title="Top-up Exposure" value={formatMoney(topUps.reduce((sum, item) => sum + item.amount, 0), "KES")} subtitle="Support or settlement items" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current stock</CardTitle>
            <CardDescription>Available stock and reorder pressure by SKU.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading franchise detail…</div>
            ) : (
              <DataTable data={stockRows} columns={stockColumns} emptyMessage="No stock rows." />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Replenishment history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={replenishments} columns={replenishmentColumns} emptyMessage="No replenishment orders." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top-up history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={topUps} columns={topUpColumns} emptyMessage="No top-up records." />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

