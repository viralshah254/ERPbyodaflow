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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchExternalWorkCenters,
  fetchSubcontractOrders,
  fetchWIPBalances,
  receiveSubcontractOrder,
  createExternalWorkCenter,
  createSubcontractOrder,
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
  const [sendSheetOpen, setSendSheetOpen] = React.useState(false);
  const [workCenterSheetOpen, setWorkCenterSheetOpen] = React.useState(false);
  const [savingOrder, setSavingOrder] = React.useState(false);
  const [savingWorkCenter, setSavingWorkCenter] = React.useState(false);

  // Send to processor form state (minimal: one input + fee)
  const [orderWorkCenterId, setOrderWorkCenterId] = React.useState("");
  const [orderSku, setOrderSku] = React.useState("");
  const [orderQty, setOrderQty] = React.useState("");
  const [orderUom, setOrderUom] = React.useState("kg");
  const [orderProcessingFee, setOrderProcessingFee] = React.useState("");
  const [orderExpectedAt, setOrderExpectedAt] = React.useState("");

  // New work center form
  const [wcCode, setWcCode] = React.useState("");
  const [wcName, setWcName] = React.useState("");
  const [wcType, setWcType] = React.useState<ExternalWorkCenterRow["type"]>("FACTORY");
  const [wcAddress, setWcAddress] = React.useState("");

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

  const handleCreateWorkCenter = async () => {
    if (!wcCode.trim() || !wcName.trim()) {
      toast.error("Code and name are required.");
      return;
    }
    setSavingWorkCenter(true);
    try {
      const created = await createExternalWorkCenter({
        code: wcCode.trim(),
        name: wcName.trim(),
        type: wcType,
        address: wcAddress.trim() || undefined,
        isActive: true,
      });
      toast.success("Work center created.");
      setWcCode("");
      setWcName("");
      setWcAddress("");
      setWcType("FACTORY");
      setWorkCenterSheetOpen(false);
      // Refresh list, preserving filters
      await load();
      // Pre-select the new work center in filters
      setWorkCenterFilter(created.id);
    } catch (e) {
      const msg = (e as Error)?.message ?? "Create failed";
      toast.error(msg === "STUB" ? "Configure API to create work centers." : msg);
    } finally {
      setSavingWorkCenter(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderWorkCenterId || !orderSku.trim() || !orderQty) {
      toast.error("Work center, SKU and quantity are required.");
      return;
    }
    const qty = Number(orderQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    setSavingOrder(true);
    try {
      await createSubcontractOrder({
        workCenterId: orderWorkCenterId,
        expectedAt: orderExpectedAt || undefined,
        lines: [
          {
            sku: orderSku.trim(),
            type: "INPUT",
            quantity: qty,
            uom: orderUom,
          },
          orderProcessingFee
            ? {
                sku: `${orderSku.trim()}-PROC`,
                productName: "Processing service",
                type: "OUTPUT_PRIMARY",
                quantity: qty,
                uom: orderUom,
                processingFeePerUnit: Number(orderProcessingFee),
              }
            : undefined,
        ].filter(Boolean) as {
          sku: string;
          productName?: string;
          type: any;
          quantity: number;
          uom: string;
          processingFeePerUnit?: number | null;
        }[],
      });
      toast.success("Subcontract order created.");
      setSendSheetOpen(false);
      setOrderWorkCenterId("");
      setOrderSku("");
      setOrderQty("");
      setOrderProcessingFee("");
      setOrderExpectedAt("");
      await load();
      setTab("orders");
    } catch (e) {
      const msg = (e as Error)?.message ?? "Create failed";
      toast.error(msg === "STUB" ? "Configure API to create subcontract orders." : msg);
    } finally {
      setSavingOrder(false);
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
          <Sheet open={sendSheetOpen} onOpenChange={setSendSheetOpen}>
            <SheetTrigger asChild>
              <Button>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Send to processor
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Send to processor</SheetTitle>
                <SheetDescription>
                  Create a subcontract order: send input stock to an external work center, optionally with a processing fee per unit.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="orderWorkCenter">Work center</Label>
                  <Select value={orderWorkCenterId || ""} onValueChange={setOrderWorkCenterId}>
                    <SelectTrigger id="orderWorkCenter">
                      <SelectValue placeholder="Select work center" />
                    </SelectTrigger>
                    <SelectContent>
                      {workCenters.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orderSku">Input SKU</Label>
                  <Input id="orderSku" value={orderSku} onChange={(e) => setOrderSku(e.target.value)} placeholder="e.g. ROUND-001" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="orderQty">Quantity</Label>
                    <Input id="orderQty" type="number" min={0} step="0.01" value={orderQty} onChange={(e) => setOrderQty(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="orderUom">UOM</Label>
                    <Input id="orderUom" value={orderUom} onChange={(e) => setOrderUom(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orderProcessingFee">Processing fee / unit (optional, KES)</Label>
                  <Input
                    id="orderProcessingFee"
                    type="number"
                    min={0}
                    step="0.01"
                    value={orderProcessingFee}
                    onChange={(e) => setOrderProcessingFee(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orderExpectedAt">Expected completion date (optional)</Label>
                  <Input
                    id="orderExpectedAt"
                    type="date"
                    value={orderExpectedAt}
                    onChange={(e) => setOrderExpectedAt(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateOrder} disabled={savingOrder}>
                  {savingOrder ? "Creating…" : "Create order"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>External work centers</CardTitle>
                    <CardDescription>Factories and women's groups; stock is sent here for processing.</CardDescription>
                  </div>
                  <Sheet open={workCenterSheetOpen} onOpenChange={setWorkCenterSheetOpen}>
                    <SheetTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Icons.Plus className="mr-2 h-4 w-4" />
                        New work center
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>New external work center</SheetTitle>
                        <SheetDescription>Register a factory or women's group that receives stock for processing.</SheetDescription>
                      </SheetHeader>
                      <div className="grid gap-4 py-6">
                        <div className="grid gap-2">
                          <Label htmlFor="wcCode">Code</Label>
                          <Input id="wcCode" value={wcCode} onChange={(e) => setWcCode(e.target.value)} placeholder="e.g. FACT-NAI" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="wcName">Name</Label>
                          <Input id="wcName" value={wcName} onChange={(e) => setWcName(e.target.value)} placeholder="e.g. Nairobi Industrial Factory" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="wcType">Type</Label>
                          <Select value={wcType} onValueChange={(v) => setWcType(v as ExternalWorkCenterRow["type"])}>
                            <SelectTrigger id="wcType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FACTORY">Factory</SelectItem>
                              <SelectItem value="GROUP">Women's group</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="wcAddress">Address (optional)</Label>
                          <Input id="wcAddress" value={wcAddress} onChange={(e) => setWcAddress(e.target.value)} placeholder="Address" />
                        </div>
                        <Button onClick={handleCreateWorkCenter} disabled={savingWorkCenter}>
                          {savingWorkCenter ? "Saving…" : "Create work center"}
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<ExternalWorkCenterRow>
                    data={workCenters}
                    columns={workCenterColumns}
                    emptyMessage="No work centers."
                    onRowClick={(row) => {
                      setWorkCenterFilter(row.id);
                      setTab("wip");
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
