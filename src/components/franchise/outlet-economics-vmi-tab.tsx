"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  fetchFranchiseNetworkOutletById,
  fetchFranchiseeStock,
  fetchVMIReplenishmentOrders,
  fetchTopUps,
} from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";

export function OutletEconomicsVmiTab({ outletOrgId }: { outletOrgId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [outletMeta, setOutletMeta] = React.useState<Awaited<
    ReturnType<typeof fetchFranchiseNetworkOutletById>
  > | null>(null);
  const [stockRows, setStockRows] = React.useState<
    Array<{ sku: string; productName: string; qty: number; reorderPoint: number; suggestedOrder: number }>
  >([]);
  const [replenishments, setReplenishments] = React.useState<
    Array<{ number: string; status: string; totalQty: number; createdAt: string }>
  >([]);
  const [topUps, setTopUps] = React.useState<
    Array<{ runNumber: string; amount: number; reason: string; status: string }>
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const meta = await fetchFranchiseNetworkOutletById(outletOrgId);
        if (cancelled) return;
        setOutletMeta(meta);
        const vmiKey = meta?.franchiseeRegistryId ?? outletOrgId;
        const [stock, orders, topupRows] = await Promise.all([
          fetchFranchiseeStock(vmiKey),
          fetchVMIReplenishmentOrders({ franchiseeId: vmiKey }),
          fetchTopUps({ franchiseeId: vmiKey }),
        ]);
        if (cancelled) return;
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
          setStockRows([]);
          setReplenishments([]);
          setTopUps([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outletOrgId]);

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
    {
      id: "createdAt",
      header: "Created",
      accessor: (r: (typeof replenishments)[number]) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  const topUpColumns = [
    { id: "run", header: "Run", accessor: (r: (typeof topUps)[number]) => r.runNumber, sticky: true },
    { id: "amount", header: "Amount", accessor: (r: (typeof topUps)[number]) => formatMoney(r.amount, "KES") },
    { id: "reason", header: "Reason", accessor: (r: (typeof topUps)[number]) => r.reason },
    { id: "status", header: "Status", accessor: (r: (typeof topUps)[number]) => r.status },
  ];

  return (
    <div className="space-y-6">
      {outletMeta && !outletMeta.franchiseeRegistryId ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-950 dark:text-amber-100">VMI and top-ups may be incomplete</p>
          <p className="mt-1 text-muted-foreground">
            Link this outlet to an HQ franchisee registry record via{" "}
            <Link href="/franchise/royalties" className="text-primary underline">
              Royalty billing
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <OperationalKpiCard
          title="Posted retail sales"
          value={formatMoney(outletMeta?.revenue ?? 0, "KES")}
          subtitle="Outlet customer invoices (posted)"
        />
        <OperationalKpiCard
          title="AR Overdue"
          value={formatMoney(outletMeta?.arOverdue ?? 0, "KES")}
          subtitle="Collections pressure"
          severity={(outletMeta?.arOverdue ?? 0) > 0 ? "warning" : "default"}
        />
        <OperationalKpiCard
          title="Outlet on-hand (posted)"
          value={outletMeta?.totalStockQty ?? 0}
          subtitle="Sum of StockLevel in the outlet org"
        />
        <OperationalKpiCard title="VMI snapshot SKUs" value={stockRows.length} subtitle="VMI ingest / reorder" />
        <OperationalKpiCard
          title="Top-up Exposure"
          value={formatMoney(topUps.reduce((sum, item) => sum + item.amount, 0), "KES")}
          subtitle="Support or settlement items"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VMI stock snapshot</CardTitle>
          <CardDescription>
            Per-SKU quantities from VMI ingest. Posted stock is in the Stock tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <DataTable data={stockRows} columns={stockColumns} emptyMessage="No VMI snapshot rows." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>VMI replenishment orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={replenishments}
              columns={replenishmentColumns}
              emptyMessage="No VMI replenishment orders."
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
  );
}
