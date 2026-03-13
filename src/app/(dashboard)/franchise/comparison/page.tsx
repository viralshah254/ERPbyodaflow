"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SegmentMixCard } from "@/components/operational/SegmentMixCard";
import { fetchFranchiseNetworkOutlets } from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";

type ComparisonRow = {
  franchiseeId: string;
  franchiseeName: string;
  totalQty: number;
  territory?: string;
  stockRisk: number;
  revenue: number;
  arOverdue: number;
};

export default function FranchiseComparisonPage() {
  const [rows, setRows] = React.useState<ComparisonRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFranchiseNetworkOutlets()
      .then((outlets) => {
        if (cancelled) return;
        setRows(
          outlets
            .map((outlet) => ({
              franchiseeId: outlet.id,
              franchiseeName: outlet.name,
              territory: outlet.territory,
              totalQty: outlet.totalStockQty,
              stockRisk: outlet.lowStockCount,
              revenue: outlet.revenue,
              arOverdue: outlet.arOverdue,
            }))
            .sort((a, b) => b.revenue - a.revenue)
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
    { id: "name", header: "Franchisee", accessor: (r: ComparisonRow) => r.franchiseeName, sticky: true },
    { id: "territory", header: "Territory", accessor: (r: ComparisonRow) => r.territory ?? "—" },
    { id: "qty", header: "Qty on hand", accessor: (r: ComparisonRow) => r.totalQty },
    { id: "revenue", header: "Revenue", accessor: (r: ComparisonRow) => formatMoney(r.revenue, "KES") },
    { id: "risk", header: "Stock risk", accessor: (r: ComparisonRow) => r.stockRisk },
    { id: "ar", header: "AR overdue", accessor: (r: ComparisonRow) => formatMoney(r.arOverdue, "KES") },
    {
      id: "actions",
      header: "",
      accessor: (r: ComparisonRow) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/franchise/${r.franchiseeId}`}>Open</Link>
        </Button>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Franchise Comparison"
        description="Compare outlet revenue, stock exposure, and collections risk across the franchise network."
        breadcrumbs={[{ label: "Franchise", href: "/franchise/overview" }, { label: "Comparison" }]}
        sticky
        showCommandHint
      />
      <div className="p-6 space-y-6">
        <SegmentMixCard
          title="Network Mix"
          description="Current stock share by top franchise nodes."
          unit="kg"
          items={rows.slice(0, 5).map((row, index) => ({
            label: row.franchiseeName,
            value: row.totalQty,
            accentClassName: [
              "bg-primary",
              "bg-sky-500",
              "bg-emerald-500",
              "bg-amber-500",
              "bg-rose-500",
            ][index] ?? "bg-primary",
          }))}
        />
        <Card>
          <CardHeader>
            <CardTitle>Comparison table</CardTitle>
            <CardDescription>Network ranking now uses real revenue, stock, and receivables exposure signals.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading comparison…</div>
            ) : (
              <DataTable<ComparisonRow> data={rows} columns={columns} emptyMessage="No franchise comparison data." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

