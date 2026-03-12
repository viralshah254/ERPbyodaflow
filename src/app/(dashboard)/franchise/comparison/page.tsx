"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SegmentMixCard } from "@/components/operational/SegmentMixCard";
import { fetchFranchiseeStock, fetchTopUps } from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";

type ComparisonRow = {
  franchiseeId: string;
  franchiseeName: string;
  totalQty: number;
  skus: number;
  stockTurnProxy: number;
  topUpDependency: number;
};

export default function FranchiseComparisonPage() {
  const [rows, setRows] = React.useState<ComparisonRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchFranchiseeStock(), fetchTopUps()])
      .then(([stock, topUps]) => {
        if (cancelled) return;
        const topUpByFranchisee = new Map<string, number>();
        for (const t of topUps) {
          topUpByFranchisee.set(t.franchiseeId, (topUpByFranchisee.get(t.franchiseeId) ?? 0) + t.amount);
        }
        const byId = new Map<string, ComparisonRow>();
        for (const s of stock) {
          const row = byId.get(s.franchiseeId) ?? {
            franchiseeId: s.franchiseeId,
            franchiseeName: s.franchiseeName,
            totalQty: 0,
            skus: 0,
            stockTurnProxy: 0,
            topUpDependency: topUpByFranchisee.get(s.franchiseeId) ?? 0,
          };
          row.totalQty += s.qty;
          row.skus += 1;
          // Mock proxy: lower qty with higher reorder points implies faster turns.
          row.stockTurnProxy += Math.max(0, s.reorderPoint - s.qty);
          byId.set(s.franchiseeId, row);
        }
        setRows(Array.from(byId.values()).sort((a, b) => b.stockTurnProxy - a.stockTurnProxy));
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
    { id: "qty", header: "Qty on hand", accessor: (r: ComparisonRow) => r.totalQty },
    { id: "skus", header: "SKU count", accessor: (r: ComparisonRow) => r.skus },
    { id: "turns", header: "Stock velocity (proxy)", accessor: (r: ComparisonRow) => r.stockTurnProxy },
    { id: "topup", header: "Top-up dependency", accessor: (r: ComparisonRow) => formatMoney(r.topUpDependency, "KES") },
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
        description="Rank franchisees by stock velocity and top-up dependency."
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
            <CardDescription>This view can be upgraded to analytics-backed ranking once backend metrics are ready.</CardDescription>
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

