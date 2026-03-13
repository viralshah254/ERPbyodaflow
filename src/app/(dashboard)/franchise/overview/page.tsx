"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { FranchiseHealthCard } from "@/components/operational/FranchiseHealthCard";
import { fetchFranchiseNetworkSummary } from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";

type FranchiseOverviewRow = {
  franchiseeId: string;
  franchiseeName: string;
  territory?: string;
  storeFormat?: string;
  qtyOnHand: number;
  lowStockCount: number;
  invoiceCount: number;
  revenue: number;
  arOverdue: number;
};

export default function FranchiseOverviewPage() {
  const [rows, setRows] = React.useState<FranchiseOverviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFranchiseNetworkSummary()
      .then((summary) => {
        if (cancelled) return;
        setRows(
          summary.outlets.map((outlet) => ({
            franchiseeId: outlet.id,
            franchiseeName: outlet.name,
            territory: outlet.territory,
            storeFormat: outlet.storeFormat,
            qtyOnHand: outlet.totalStockQty,
            lowStockCount: outlet.lowStockCount,
            invoiceCount: outlet.invoiceCount,
            revenue: outlet.revenue,
            arOverdue: outlet.arOverdue,
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = [
    {
      id: "franchisee",
      header: "Franchisee",
      accessor: (r: FranchiseOverviewRow) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.franchiseeName}</span>
          {r.storeFormat ? <Badge variant="secondary">{r.storeFormat}</Badge> : null}
        </div>
      ),
      sticky: true,
    },
    { id: "territory", header: "Territory", accessor: (r: FranchiseOverviewRow) => r.territory ?? "—" },
    { id: "qty", header: "Qty on hand", accessor: (r: FranchiseOverviewRow) => r.qtyOnHand },
    { id: "lowStock", header: "Low stock alerts", accessor: (r: FranchiseOverviewRow) => r.lowStockCount },
    { id: "invoiceCount", header: "Invoices", accessor: (r: FranchiseOverviewRow) => r.invoiceCount },
    { id: "revenue", header: "Revenue", accessor: (r: FranchiseOverviewRow) => formatMoney(r.revenue, "KES") },
    { id: "arOverdue", header: "AR overdue", accessor: (r: FranchiseOverviewRow) => formatMoney(r.arOverdue, "KES") },
    {
      id: "actions",
      header: "",
      accessor: (r: FranchiseOverviewRow) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/franchise/${r.franchiseeId}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Franchise Overview"
        description="Health, replenishment pressure, commission and top-up exposure by franchise."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/overview" }, { label: "Overview" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/franchise/vmi">VMI & Replenishment</Link>
            </Button>
            <Button asChild>
              <Link href="/franchise/commission">Commission & Rebates</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalKpiCard
            title="Franchisees Visible"
            value={rows.length}
            subtitle="Network entities in current dataset"
            href="/franchise/comparison"
          />
          <OperationalKpiCard
            title="Low Stock Exposure"
            value={rows.reduce((a, r) => a + (r.lowStockCount > 0 ? 1 : 0), 0)}
            subtitle="Franchisees needing replenishment"
            severity="warning"
            href="/franchise/vmi"
          />
          <OperationalKpiCard
            title="Network Revenue"
            value={formatMoney(rows.reduce((a, r) => a + r.revenue, 0), "KES")}
            subtitle="Posted outlet invoices"
            href="/analytics/explore"
          />
          <OperationalKpiCard
            title="AR Overdue"
            value={formatMoney(rows.reduce((a, r) => a + r.arOverdue, 0), "KES")}
            subtitle="Collections pressure across outlets"
            severity="danger"
            href="/treasury/collections"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {rows.slice(0, 4).map((row) => (
            <FranchiseHealthCard
              key={row.franchiseeId}
              franchiseeId={row.franchiseeId}
              franchiseeName={row.franchiseeName}
              qtyOnHand={row.qtyOnHand}
              skuCount={row.invoiceCount}
              topUpExposure={row.arOverdue}
              openReplenishments={row.lowStockCount}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Network health</CardTitle>
            <CardDescription>Operational visibility for parent company team.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading franchise overview…</div>
            ) : (
              <DataTable<FranchiseOverviewRow> data={rows} columns={columns} emptyMessage="No franchise data available." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

