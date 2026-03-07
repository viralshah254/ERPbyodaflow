"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchExternalWorkCenters,
  fetchSubcontractOrders,
  fetchWIPBalances,
  receiveSubcontractOrder,
} from "@/lib/api/cool-catch";
import type { ExternalWorkCenterRow, SubcontractOrderRow, WIPBalanceRow } from "@/lib/mock/manufacturing/subcontracting";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function SubcontractingPage() {
  const [tab, setTab] = React.useState<"orders" | "wip" | "workcenters">("orders");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<string>("");
  const [workCenterFilter, setWorkCenterFilter] = React.useState<string>("");
  const [workCenters, setWorkCenters] = React.useState<ExternalWorkCenterRow[]>([]);
  const [orders, setOrders] = React.useState<SubcontractOrderRow[]>([]);
  const [wip, setWip] = React.useState<WIPBalanceRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [receivingId, setReceivingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchExternalWorkCenters().then(setWorkCenters),
      fetchSubcontractOrders({
        ...(orderStatusFilter ? { status: orderStatusFilter } : {}),
        ...(workCenterFilter ? { workCenterId: workCenterFilter } : {}),
      }).then(setOrders),
      fetchWIPBalances(workCenterFilter || undefined).then(setWip),
    ])
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        toast.error(e?.message ?? "Failed to load data");
      });
  }, [orderStatusFilter, workCenterFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleReceive = async (order: SubcontractOrderRow) => {
    if (order.status !== "WIP") return;
    setReceivingId(order.id);
    try {
      await receiveSubcontractOrder(order.id);
      toast.success("Order marked received.");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Receive failed");
    } finally {
      setReceivingId(null);
    }
  };

  const orderColumns = [
    { id: "number", header: "Order", accessor: (r: SubcontractOrderRow) => <span className="font-medium">{r.number}</span>, sticky: true },
    { id: "workCenter", header: "Work center", accessor: (r: SubcontractOrderRow) => r.workCenterName },
    { id: "bom", header: "BOM", accessor: (r: SubcontractOrderRow) => r.bomName ?? "—" },
    { id: "status", header: "Status", accessor: (r: SubcontractOrderRow) => (
      <Badge variant={r.status === "RECEIVED" ? "default" : r.status === "WIP" ? "secondary" : "outline"}>{r.status}</Badge>
    ) },
    { id: "sentAt", header: "Sent", accessor: (r: SubcontractOrderRow) => r.sentAt ?? "—" },
    { id: "receivedAt", header: "Received", accessor: (r: SubcontractOrderRow) => r.receivedAt ?? "—" },
    { id: "actions", header: "", accessor: (r: SubcontractOrderRow) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" asChild><Link href={`/manufacturing/subcontracting/orders/${r.id}`}>View</Link></Button>
        {r.status === "WIP" && (
          <Button size="sm" variant="outline" disabled={receivingId === r.id} onClick={() => handleReceive(r)}>
            {receivingId === r.id ? "Receiving…" : "Receive"}
          </Button>
        )}
      </div>
    ) },
  ];

  const wipColumns = [
    { id: "workCenter", header: "Work center", accessor: (r: WIPBalanceRow) => <span className="font-medium">{r.workCenterName}</span>, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: WIPBalanceRow) => r.sku },
    { id: "product", header: "Product", accessor: (r: WIPBalanceRow) => r.productName },
    { id: "quantity", header: "Quantity", accessor: (r: WIPBalanceRow) => `${r.quantity} ${r.uom}` },
    { id: "updated", header: "Last movement", accessor: (r: WIPBalanceRow) => new Date(r.lastMovementAt).toLocaleString() },
  ];

  const workCenterColumns = [
    { id: "code", header: "Code", accessor: (r: ExternalWorkCenterRow) => <span className="font-medium">{r.code}</span>, sticky: true },
    { id: "name", header: "Name", accessor: (r: ExternalWorkCenterRow) => r.name },
    { id: "type", header: "Type", accessor: (r: ExternalWorkCenterRow) => r.type },
    { id: "address", header: "Address", accessor: (r: ExternalWorkCenterRow) => r.address ?? "—" },
    { id: "active", header: "Active", accessor: (r: ExternalWorkCenterRow) => r.isActive ? "Yes" : "No" },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Subcontracting / Job Work"
        description="WIP at external work centers (factories, women's groups); processing fees and yield"
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Subcontracting" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button onClick={() => toast.info("Create order: POST /api/manufacturing/subcontract-orders")}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Send to processor
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex gap-2 border-b">
          {(["orders", "wip", "workcenters"] as const).map((t) => (
            <Button key={t} variant={tab === t ? "secondary" : "ghost"} size="sm" onClick={() => setTab(t)}>
              {t === "orders" ? "Subcontract orders" : t === "wip" ? "WIP at processors" : "External work centers"}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            {tab === "orders" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Subcontract orders</CardTitle>
                    <CardDescription>Send material to processor; receive finished goods with processing fee and yield.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={workCenterFilter || "ALL"} onValueChange={(v) => setWorkCenterFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-52">
                        <SelectValue placeholder="Work center" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All work centers</SelectItem>
                        {workCenters.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={orderStatusFilter || "ALL"} onValueChange={(v) => setOrderStatusFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="WIP">WIP</SelectItem>
                        <SelectItem value="RECEIVED">Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<SubcontractOrderRow> data={orders} columns={orderColumns} emptyMessage="No subcontract orders." />
                </CardContent>
              </Card>
            )}

            {tab === "wip" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>WIP at processors</CardTitle>
                    <CardDescription>Inventory on your books but physically at external work center.</CardDescription>
                  </div>
                  <Select value={workCenterFilter || "ALL"} onValueChange={(v) => setWorkCenterFilter(v === "ALL" ? "" : v)}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Work center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All work centers</SelectItem>
                      {workCenters.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<WIPBalanceRow & { id?: string }> data={wip as (WIPBalanceRow & { id?: string })[]} columns={wipColumns} emptyMessage="No WIP." />
                </CardContent>
              </Card>
            )}

            {tab === "workcenters" && (
              <Card>
                <CardHeader>
                  <CardTitle>External work centers</CardTitle>
                  <CardDescription>Factories and women's groups; stock is sent here for processing.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<ExternalWorkCenterRow> data={workCenters} columns={workCenterColumns} emptyMessage="No work centers." />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
