"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  fetchFranchiseeStock,
  fetchFranchiseNetworkOutletById,
  fetchVMIReplenishmentOrders,
  fetchTopUps,
  patchFranchiseNetworkOutletApi,
  deleteFranchiseNetworkOutletApi,
  type FranchiseNetworkOutletRow,
} from "@/lib/api/cool-catch";
import { OperationalKpiCard } from "@/components/operational/OperationalKpiCard";
import { formatMoney } from "@/lib/money";
import { FranchiseProductEconomicsSection } from "@/components/franchise/franchise-product-economics-section";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export default function FranchiseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const routeRef = String(params?.id ?? "");
  const permissions = useAuthStore((s) => s.permissions);
  const canManage =
    permissions.includes("franchise.network.write") || permissions.includes("admin.users");
  const [name, setName] = React.useState(routeRef);
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<{ territory?: string; storeFormat?: string; revenue: number; arOverdue: number } | null>(null);
  const [stockRows, setStockRows] = React.useState<Array<{ sku: string; productName: string; qty: number; reorderPoint: number; suggestedOrder: number }>>([]);
  const [replenishments, setReplenishments] = React.useState<Array<{ number: string; status: string; totalQty: number; createdAt: string }>>([]);
  const [topUps, setTopUps] = React.useState<Array<{ runNumber: string; amount: number; reason: string; status: string }>>([]);
  const [outletMeta, setOutletMeta] = React.useState<FranchiseNetworkOutletRow | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: "",
    outletCode: "",
    territory: "",
    storeFormat: "",
    managerName: "",
  });
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const openEdit = () => {
    if (!outletMeta) return;
    setEditForm({
      name: outletMeta.name ?? "",
      outletCode: outletMeta.code ?? "",
      territory: outletMeta.territory ?? "",
      storeFormat: outletMeta.storeFormat ?? "",
      managerName: outletMeta.managerName ?? "",
    });
    setEditOpen(true);
  };

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const outletMetaRow = await fetchFranchiseNetworkOutletById(routeRef);
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
      setOutletMeta(null);
      setSummary(null);
      setName(routeRef);
    } finally {
      setLoading(false);
    }
  }, [routeRef]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSaveEdit = async () => {
    if (!outletMeta) return;
    if (!editForm.name.trim() || !editForm.outletCode.trim()) {
      toast.error("Name and outlet code are required.");
      return;
    }
    setSavingEdit(true);
    try {
      await patchFranchiseNetworkOutletApi(outletMeta.id, {
        name: editForm.name.trim(),
        outletCode: editForm.outletCode.trim(),
        territory: editForm.territory.trim() || undefined,
        storeFormat: editForm.storeFormat.trim() || undefined,
        managerName: editForm.managerName.trim() || undefined,
      });
      toast.success("Franchise updated.");
      setEditOpen(false);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteOutlet = async () => {
    if (!outletMeta) return;
    setDeleting(true);
    try {
      await deleteFranchiseNetworkOutletApi(outletMeta.id);
      toast.success("Outlet removed from the active network.");
      router.push("/franchise/network/outlets");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove outlet.");
    } finally {
      setDeleting(false);
    }
  };

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
          <div className="flex flex-wrap gap-2">
            {canManage && outletMeta ? (
              <>
                <Button type="button" variant="outline" onClick={openEdit}>
                  Edit franchise
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Remove from network
                </Button>
              </>
            ) : null}
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

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit franchisee</SheetTitle>
            <SheetDescription>Name, code, territory, format, and manager appear across the network and HQ billing.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="fd-name">Outlet / franchisee name</Label>
              <Input id="fd-name" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-code">Outlet code</Label>
              <Input
                id="fd-code"
                className="font-mono text-sm"
                value={editForm.outletCode}
                onChange={(e) => setEditForm((p) => ({ ...p, outletCode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-territory">Territory</Label>
              <Input
                id="fd-territory"
                value={editForm.territory}
                onChange={(e) => setEditForm((p) => ({ ...p, territory: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-format">Store format</Label>
              <Input
                id="fd-format"
                value={editForm.storeFormat}
                onChange={(e) => setEditForm((p) => ({ ...p, storeFormat: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fd-manager">Manager name</Label>
              <Input
                id="fd-manager"
                value={editForm.managerName}
                onChange={(e) => setEditForm((p) => ({ ...p, managerName: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSaveEdit()} disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={outletMeta ? `Remove “${outletMeta.name}” from the network?` : "Remove outlet?"}
        description="Suspends outlet users and exits the franchise agreement. Org data and documents are kept on file."
        confirmLabel={deleting ? "Removing…" : "Remove from network"}
        variant="destructive"
        onConfirm={() => void handleDeleteOutlet()}
      />
    </PageShell>
  );
}
