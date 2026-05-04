"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  fetchFranchiseeStock,
  fetchFranchiseNetworkOutletById,
  fetchVMIReplenishmentOrders,
  fetchTopUps,
  type FranchiseNetworkOutletRow,
} from "@/lib/api/cool-catch";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { formatMoney } from "@/lib/money";
import { FranchiseProductEconomicsSection } from "@/components/franchise/franchise-product-economics-section";

export default function FranchiseDetailPage() {
  const params = useParams<{ id: string }>();
  const routeRef = String(params?.id ?? "");
  const [name, setName] = React.useState(routeRef);
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<{ territory?: string; storeFormat?: string; revenue: number; arOverdue: number } | null>(null);
  const [stockRows, setStockRows] = React.useState<Array<{ sku: string; productName: string; qty: number; reorderPoint: number; suggestedOrder: number }>>([]);
  const [replenishments, setReplenishments] = React.useState<Array<{ number: string; status: string; totalQty: number; createdAt: string }>>([]);
  const [topUps, setTopUps] = React.useState<Array<{ runNumber: string; amount: number; reason: string; status: string }>>([]);
  const [outletMeta, setOutletMeta] = React.useState<FranchiseNetworkOutletRow | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const outletMetaRow = await fetchFranchiseNetworkOutletById(routeRef);
        if (cancelled) return;
        setOutletMeta(outletMetaRow);
        const outletOrgId = outletMetaRow?.id ?? routeRef;
        const franchiseeRegistryId = outletMetaRow?.franchiseeRegistryId;
        const vmiKey = franchiseeRegistryId ?? outletOrgId;
        setSummary(
          outletMetaRow
            ? {
                territory: outletMetaRow.territory,
                storeFormat: outletMetaRow.storeFormat,
                revenue: outletMetaRow.revenue,
                arOverdue: outletMetaRow.arOverdue,
              }
            : null
        );
        setName(outletMetaRow?.name ?? routeRef);
        const [stock, orders, topupRows] = await Promise.all([
          fetchFranchiseeStock(vmiKey),
          fetchVMIReplenishmentOrders({ franchiseeId: vmiKey }),
          fetchTopUps({ franchiseeId: vmiKey }),
        ]);
        if (cancelled) return;
        setName(
          outletMetaRow?.name ?? stock[0]?.franchiseeName ?? orders[0]?.franchiseeName ?? routeRef
        );
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
      } catch {
        if (!cancelled) {
          setOutletMeta(null);
          setSummary(null);
          setName(routeRef);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [routeRef]);

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
        {outletMeta && !outletMeta.franchiseeRegistryId ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-amber-950 dark:text-amber-100">VMI and top-ups may be incomplete</p>
            <p className="mt-1 text-muted-foreground">
              This outlet is not linked to an HQ franchisee registry record yet. In OdaFlow, open{" "}
              <Link href="/franchise/royalties" className="text-primary underline underline-offset-2">
                Franchise → Royalty billing
              </Link>{" "}
              or{" "}
              <Link href="/franchise/network/outlets" className="text-primary underline underline-offset-2">
                Franchise network → Outlets
              </Link>{" "}
              while signed in as HQ, find the matching franchisee row, then link it with the API below (there is no separate &quot;Finance → Franchise&quot; menu in this build).
            </p>
            <p className="mt-2 font-mono text-xs break-all text-muted-foreground">
              Outlet org id (use as <code className="text-foreground">outletOrgId</code> in PATCH): {outletMeta.id}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <code className="rounded bg-muted px-1 py-0.5">
                PATCH /api/franchise/franchisees/&lt;franchiseeId&gt;
              </code>{" "}
              with body{" "}
              <code className="rounded bg-muted px-1 py-0.5 break-all">
                {`{"outletOrgId":"${outletMeta.id}"}`}
              </code>
              . List franchisees:{" "}
              <code className="rounded bg-muted px-1 py-0.5">GET /api/franchise/franchisees</code>.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <OperationalKpiCard
            title="Posted retail sales"
            value={formatMoney(summary?.revenue ?? 0, "KES")}
            subtitle="Outlet customer invoices (posted)"
          />
          <OperationalKpiCard
            title="AR Overdue"
            value={formatMoney(summary?.arOverdue ?? 0, "KES")}
            subtitle="Collections pressure"
            severity={(summary?.arOverdue ?? 0) > 0 ? "warning" : "default"}
          />
          <OperationalKpiCard
            title="Outlet on-hand (posted)"
            value={outletMeta?.totalStockQty ?? 0}
            subtitle="Sum of StockLevel in the outlet org (POS-style inventory)"
          />
          <OperationalKpiCard
            title="VMI snapshot SKUs"
            value={stockRows.length}
            subtitle="Rows from VMI ingest / reorder (not always equal to posted stock)"
          />
          <OperationalKpiCard
            title="Top-up Exposure"
            value={formatMoney(topUps.reduce((sum, item) => sum + item.amount, 0), "KES")}
            subtitle="Support or settlement items"
          />
        </div>

        <FranchiseProductEconomicsSection
          franchiseeRegistryId={outletMeta?.franchiseeRegistryId}
          outletOrgId={outletMeta?.id}
        />

        <Card>
          <CardHeader>
            <CardTitle>VMI stock snapshot</CardTitle>
            <CardDescription>
              Per-SKU quantities from VMI ingest and reorder rules. Outlet selling uses posted inventory (see outlet on-hand KPI). HQ shipments confirmed via POD post as goods receipts (GRNs) in the outlet org—open{" "}
              <Link href="/inventory/receipts" className="text-primary underline underline-offset-2">
                Inventory → Receipts
              </Link>{" "}
              while scoped to that outlet to review them.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading franchise detail…</div>
            ) : (
              <DataTable
                data={stockRows}
                columns={stockColumns}
                emptyMessage="No VMI snapshot rows for this franchisee."
              />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>VMI replenishment orders</CardTitle>
              <CardDescription>
                Cold Hub / VMI transfers and suggested replenishment workflow. This is separate from HQ delivery notes: POD on a franchise shipment creates or posts outlet GRNs and updates posted stock, which may not appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={replenishments}
                columns={replenishmentColumns}
                emptyMessage="No VMI replenishment orders for this franchisee."
              />
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
