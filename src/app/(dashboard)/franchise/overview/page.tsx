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
import { fetchFranchiseeStock, fetchVMIReplenishmentOrders, fetchCommissionRuns, fetchTopUps } from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";

type FranchiseOverviewRow = {
  franchiseeId: string;
  franchiseeName: string;
  skuCount: number;
  qtyOnHand: number;
  suggestedOrderQty: number;
  openReplenishments: number;
  postedCommission: number;
  topUpExposure: number;
};

export default function FranchiseOverviewPage() {
  const [rows, setRows] = React.useState<FranchiseOverviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchFranchiseeStock(),
      fetchVMIReplenishmentOrders(),
      fetchCommissionRuns({ status: "POSTED" }),
      fetchTopUps(),
    ])
      .then(([stock, orders, runs, topUps]) => {
        if (cancelled) return;
        const byId = new Map<string, FranchiseOverviewRow>();
        for (const s of stock) {
          const row = byId.get(s.franchiseeId) ?? {
            franchiseeId: s.franchiseeId,
            franchiseeName: s.franchiseeName,
            skuCount: 0,
            qtyOnHand: 0,
            suggestedOrderQty: 0,
            openReplenishments: 0,
            postedCommission: 0,
            topUpExposure: 0,
          };
          row.skuCount += 1;
          row.qtyOnHand += s.qty;
          row.suggestedOrderQty += s.suggestedOrder;
          byId.set(s.franchiseeId, row);
        }
        for (const o of orders) {
          const row = byId.get(o.franchiseeId);
          if (!row) continue;
          if (o.status !== "RECEIVED") row.openReplenishments += 1;
        }
        for (const r of runs) {
          for (const l of r.lines ?? []) {
            const row = byId.get(l.franchiseeId);
            if (!row) continue;
            row.postedCommission += l.commissionAmount;
          }
        }
        for (const t of topUps) {
          const row = byId.get(t.franchiseeId);
          if (!row) continue;
          row.topUpExposure += t.amount;
        }
        setRows(Array.from(byId.values()).sort((a, b) => b.qtyOnHand - a.qtyOnHand));
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
          <Badge variant="secondary">{r.skuCount} SKUs</Badge>
        </div>
      ),
      sticky: true,
    },
    { id: "qty", header: "Qty on hand", accessor: (r: FranchiseOverviewRow) => r.qtyOnHand },
    { id: "replenishment", header: "Suggested replenishment", accessor: (r: FranchiseOverviewRow) => r.suggestedOrderQty },
    { id: "openOrders", header: "Open replenishments", accessor: (r: FranchiseOverviewRow) => r.openReplenishments },
    { id: "commission", header: "Posted commission", accessor: (r: FranchiseOverviewRow) => formatMoney(r.postedCommission, "KES") },
    { id: "topup", header: "Top-up exposure", accessor: (r: FranchiseOverviewRow) => formatMoney(r.topUpExposure, "KES") },
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
            value={rows.reduce((a, r) => a + (r.suggestedOrderQty > 0 ? 1 : 0), 0)}
            subtitle="Franchisees needing replenishment"
            severity="warning"
            href="/franchise/vmi"
          />
          <OperationalKpiCard
            title="Open Replenishments"
            value={rows.reduce((a, r) => a + r.openReplenishments, 0)}
            subtitle="Orders not fully received"
            href="/distribution/transfer-planning"
          />
          <OperationalKpiCard
            title="Top-up Exposure"
            value={formatMoney(rows.reduce((a, r) => a + r.topUpExposure, 0), "KES")}
            subtitle="Current support obligations"
            severity="danger"
            href="/finance/commission-topup"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {rows.slice(0, 4).map((row) => (
            <FranchiseHealthCard
              key={row.franchiseeId}
              franchiseeId={row.franchiseeId}
              franchiseeName={row.franchiseeName}
              qtyOnHand={row.qtyOnHand}
              skuCount={row.skuCount}
              topUpExposure={row.topUpExposure}
              openReplenishments={row.openReplenishments}
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

