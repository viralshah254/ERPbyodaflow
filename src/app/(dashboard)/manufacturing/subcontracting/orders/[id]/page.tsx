"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { OwnershipLocationBadge } from "@/components/operational/OwnershipLocationBadge";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import { fetchSubcontractOrderById, fetchSubcontractCostingDrilldown, receiveSubcontractOrder } from "@/lib/api/cool-catch";
import type { SubcontractOrderLineRow } from "@/lib/mock/manufacturing/subcontracting";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export default function SubcontractOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = React.useState<Awaited<ReturnType<typeof fetchSubcontractOrderById>>>(null);
  const [loading, setLoading] = React.useState(true);
  const [receiving, setReceiving] = React.useState(false);
  const [drilldown, setDrilldown] = React.useState<Awaited<ReturnType<typeof fetchSubcontractCostingDrilldown>>>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchSubcontractOrderById(id)
      .then((r) => { if (!cancelled) setOrder(r); })
      .catch(() => { if (!cancelled) setOrder(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    fetchSubcontractCostingDrilldown(id).then((r) => {
      if (!cancelled) setDrilldown(r);
    });
    return () => { cancelled = true; };
  }, [id]);

  const handleReceive = async () => {
    if (!order || order.status !== "WIP") return;
    setReceiving(true);
    try {
      await receiveSubcontractOrder(order.id);
      toast.success("Order marked received.");
      const updated = await fetchSubcontractOrderById(id);
      setOrder(updated);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Receive failed");
    } finally {
      setReceiving(false);
    }
  };

  const lineColumns = [
    { id: "type", header: "Type", accessor: (r: SubcontractOrderLineRow) => r.type, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: SubcontractOrderLineRow) => r.sku },
    { id: "product", header: "Product", accessor: (r: SubcontractOrderLineRow) => r.productName },
    { id: "quantity", header: "Qty", accessor: (r: SubcontractOrderLineRow) => `${r.quantity} ${r.uom}` },
    { id: "fee", header: "Fee/unit", accessor: (r: SubcontractOrderLineRow) => r.processingFeePerUnit != null ? formatMoney(r.processingFeePerUnit, "KES") : "—" },
    { id: "amount", header: "Amount", accessor: (r: SubcontractOrderLineRow) => r.amount != null ? formatMoney(r.amount, "KES") : "—" },
  ];

  if (loading) {
    return (
      <PageShell>
        <PageHeader title="Subcontract order" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/subcontracting" }, { label: "Subcontracting" }, { label: id }]} />
        <div className="p-6"><p className="text-muted-foreground text-sm">Loading…</p></div>
      </PageShell>
    );
  }

  if (!order) {
    return (
      <PageShell>
        <PageHeader title="Order not found" breadcrumbs={[{ label: "Manufacturing", href: "/manufacturing/subcontracting" }, { label: "Subcontracting" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Subcontract order not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/manufacturing/subcontracting">Back to Subcontracting</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const inputQty = (order.lines ?? []).filter((line) => line.type === "INPUT").reduce((a, line) => a + line.quantity, 0);
  const primaryQty = (order.lines ?? []).filter((line) => line.type === "OUTPUT_PRIMARY").reduce((a, line) => a + line.quantity, 0);
  const secondaryQty = (order.lines ?? []).filter((line) => line.type === "OUTPUT_SECONDARY").reduce((a, line) => a + line.quantity, 0);
  const wasteQty = (order.lines ?? []).filter((line) => line.type === "WASTE").reduce((a, line) => a + line.quantity, 0);
  const feeLines = (order.lines ?? []).filter((line) => line.processingFeePerUnit != null);

  return (
    <PageShell>
      <PageHeader
        title={order.number}
        description={`${order.workCenterName} · ${order.status}`}
        breadcrumbs={[
          { label: "Manufacturing", href: "/manufacturing/boms" },
          { label: "Subcontracting", href: "/manufacturing/subcontracting" },
          { label: order.number },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {order.status === "WIP" && (
              <Button size="sm" disabled={receiving} onClick={handleReceive}>
                {receiving ? "Receiving…" : "Receive"}
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/manufacturing/subcontracting">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Subcontract Order Summary</CardTitle>
                <Badge>{order.status}</Badge>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Work center</p>
                  <p className="font-medium">{order.workCenterName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">BOM</p>
                  <p className="font-medium">{order.bomName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sent / Received</p>
                  <p className="font-medium">{order.sentAt ?? "—"} / {order.receivedAt ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ownership / Location</p>
                  <OwnershipLocationBadge owner="CoolCatch" location={order.workCenterName} />
                </div>
              </CardContent>
            </Card>

            <YieldBreakdownCard
              inputKg={inputQty}
              primaryKg={primaryQty}
              secondaryKg={secondaryQty}
              lossKg={wasteQty}
              serviceFeeTotal={feeLines.reduce((a, line) => a + (line.amount ?? 0), 0)}
            />

            {order.lines && order.lines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Lines (input / output)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable<SubcontractOrderLineRow> data={order.lines} columns={lineColumns} emptyMessage="No lines." />
                </CardContent>
              </Card>
            )}

            <CostImpactPanel
              title="Processor Cost Impact"
              currency="KES"
              quantityKg={inputQty}
              lines={[
                { label: "Primary processing fees", amount: feeLines.filter((line) => line.type === "OUTPUT_PRIMARY").reduce((a, line) => a + (line.amount ?? 0), 0) },
                { label: "Secondary/byproduct fees", amount: feeLines.filter((line) => line.type !== "OUTPUT_PRIMARY").reduce((a, line) => a + (line.amount ?? 0), 0) },
              ]}
            />
            {drilldown && (
              <Card>
                <CardHeader>
                  <CardTitle>Fee-to-COGS drilldown</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Expected vs actual yield</p>
                    <p className="font-medium">{(drilldown.expectedYield * 100).toFixed(2)}% vs {(drilldown.actualYield * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Yield variance</p>
                    <p className="font-medium">{(drilldown.yieldVariance * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Service fee variance</p>
                    <p className="font-medium">{formatMoney(drilldown.feeVariance, "KES")}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <BatchStatusTimeline
              title="Job Work Timeline"
              steps={[
                { id: "create", label: "Order created", status: "completed", timestamp: order.createdAt },
                { id: "dispatch", label: "Stock dispatched to processor", status: order.sentAt ? "completed" : "current", timestamp: order.sentAt ?? undefined },
                { id: "wip", label: "Processing / WIP", status: order.status === "WIP" ? "current" : order.status === "RECEIVED" ? "completed" : "upcoming", detail: order.workCenterName },
                { id: "receive", label: "Outputs received back", status: order.status === "RECEIVED" ? "completed" : "upcoming", timestamp: order.receivedAt ?? undefined },
              ]}
            />
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Activity & Audit</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityPanel
                  auditEntries={[
                    { id: "1", action: "Subcontract order created", user: "Processing Coordinator", timestamp: new Date(order.createdAt).toLocaleString(), detail: order.number },
                    { id: "2", action: order.status === "RECEIVED" ? "Outputs received" : "Awaiting receipt", user: "Warehouse", timestamp: new Date().toLocaleString(), detail: order.workCenterName },
                  ]}
                  comments={[
                    { id: "c1", user: "Ops", text: "Confirm actual return yield and byproduct quantities before closing batch.", timestamp: new Date().toLocaleString() },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
