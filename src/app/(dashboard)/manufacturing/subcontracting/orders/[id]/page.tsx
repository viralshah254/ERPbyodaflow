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
import { ActivityPanel } from "@/components/shared/ActivityPanel";
import { BatchStatusTimeline } from "@/components/operational/BatchStatusTimeline";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { OwnershipLocationBadge } from "@/components/operational/OwnershipLocationBadge";
import { YieldBreakdownCard } from "@/components/operational/YieldBreakdownCard";
import { fetchSubcontractOrderById, fetchSubcontractCostingDrilldown, receiveSubcontractOrder, dispatchSubcontractOrder } from "@/lib/api/cool-catch";
import { fetchAuditLogs } from "@/lib/api/audit-log";
import { fetchYieldRecords } from "@/lib/api/yield";
import type { SubcontractOrderLineRow } from "@/lib/mock/manufacturing/subcontracting";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

function ReceiveWeightRow({
  line,
  lineIndex,
  editable,
  lineActualKg,
  setLineActualKg,
}: {
  line: SubcontractOrderLineRow;
  lineIndex: number;
  editable: boolean;
  lineActualKg: string[];
  setLineActualKg: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const planned = line.plannedQuantity ?? line.quantity;
  const pack = line.packSizeKg != null && line.packSizeKg > 0 ? line.packSizeKg : null;
  const rawKg = Number.parseFloat(lineActualKg[lineIndex] ?? "") || 0;
  const boxes = pack != null ? Math.floor(Math.max(0, rawKg) / pack) : 0;
  const remainder = pack != null ? Math.round((rawKg - boxes * pack) * 100) / 100 : 0;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">{line.productName}</Label>
        <span className="text-xs text-muted-foreground">
          Planned: {planned.toLocaleString()} kg
        </span>
      </div>
      {editable ? (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={lineActualKg[lineIndex] ?? ""}
          onChange={(e) => {
            const next = [...lineActualKg];
            next[lineIndex] = e.target.value;
            setLineActualKg(next);
          }}
        />
      ) : (
        <Input
          type="number"
          readOnly
          tabIndex={-1}
          className="bg-muted/50 text-muted-foreground"
          value={lineActualKg[lineIndex] ?? String(planned)}
        />
      )}
      {editable && pack != null ? (
        <p className="text-xs text-muted-foreground">
          → {boxes.toLocaleString()} {boxes === 1 ? "box" : "boxes"}
          {remainder > 0.001
            ? ` (${remainder.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg remainder)`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

export default function SubcontractOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = React.useState<Awaited<ReturnType<typeof fetchSubcontractOrderById>>>(null);
  const [loading, setLoading] = React.useState(true);
  const [receiving, setReceiving] = React.useState(false);
  const [dispatching, setDispatching] = React.useState(false);
  const [drilldown, setDrilldown] = React.useState<Awaited<ReturnType<typeof fetchSubcontractCostingDrilldown>>>(null);
  const [auditEntries, setAuditEntries] = React.useState<Array<{ id: string; action: string; user: string; timestamp: string; detail?: string }>>([]);
  const [yieldRecords, setYieldRecords] = React.useState<Awaited<ReturnType<typeof fetchYieldRecords>>>([]);
  const [receiveSheetOpen, setReceiveSheetOpen] = React.useState(false);
  const [lineActualKg, setLineActualKg] = React.useState<string[]>([]);

  const reload = React.useCallback(async () => {
    const [r, logs, yields] = await Promise.allSettled([
      fetchSubcontractOrderById(id),
      fetchAuditLogs({ sourceType: "subcontract-order", sourceId: id }),
      fetchYieldRecords({ subcontractOrderId: id }),
    ]);
    if (r.status === "fulfilled") setOrder(r.value);
    if (logs.status === "fulfilled") {
      setAuditEntries((logs.value ?? []).map((e: any) => ({
        id: e.id ?? e._id ?? String(Math.random()),
        action: e.what ?? e.action ?? e.event ?? "Action",
        user: e.who ?? e.actorName ?? e.actor ?? "System",
        timestamp: e.when ? new Date(e.when).toLocaleString() : (e.createdAt ? new Date(e.createdAt).toLocaleString() : ""),
        detail: e.detail ?? e.description ?? "",
      })));
    }
    if (yields.status === "fulfilled") setYieldRecords(yields.value);
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reload()
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    fetchSubcontractCostingDrilldown(id).then((r) => { setDrilldown(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id, reload]);

  const handleDispatch = async () => {
    if (!order || order.status !== "SENT") return;
    setDispatching(true);
    try {
      await dispatchSubcontractOrder(order.id);
      toast.success("Order marked as In Processing (WIP).");
      await reload();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Dispatch failed");
    } finally {
      setDispatching(false);
    }
  };

  const openReceiveSheet = () => {
    if (!order || order.status !== "WIP") return;
    setLineActualKg((order.lines ?? []).map((l) => String(l.plannedQuantity ?? l.quantity)));
    setReceiveSheetOpen(true);
  };

  const handleConfirmReceive = async () => {
    if (!order || order.status !== "WIP") return;
    setReceiving(true);
    try {
      const actualLineQuantities = (order.lines ?? []).map((_, i) => ({
        lineIndex: i,
        quantity: Math.max(0, Number.parseFloat(lineActualKg[i] ?? "0") || 0),
      }));
      await receiveSubcontractOrder(order.id, { actualLineQuantities });
      toast.success("Order received with actual weights. Stock and fees updated.");
      setReceiveSheetOpen(false);
      await reload();
      fetchSubcontractCostingDrilldown(id).then((r) => { setDrilldown(r); }).catch(() => {});
    } catch (e) {
      toast.error((e as Error)?.message ?? "Receive failed");
    } finally {
      setReceiving(false);
    }
  };

  const lineColumns = React.useMemo(
    () => {
      const cols: Array<{
        id: string;
        header: string;
        accessor: (r: SubcontractOrderLineRow) => React.ReactNode;
        sticky?: boolean;
      }> = [
        { id: "type", header: "Type", accessor: (r: SubcontractOrderLineRow) => r.type, sticky: true },
        { id: "sku", header: "SKU", accessor: (r: SubcontractOrderLineRow) => r.sku },
        { id: "product", header: "Product", accessor: (r: SubcontractOrderLineRow) => r.productName },
    ];
      if (order?.status === "RECEIVED") {
        cols.push({
          id: "planned",
          header: "Planned kg",
          accessor: (r: SubcontractOrderLineRow) =>
            `${(r.plannedQuantity ?? r.quantity).toLocaleString()} ${r.uom}`,
        });
      }
      cols.push(
        {
          id: "quantity",
          header: order?.status === "RECEIVED" ? "Actual kg" : "Qty",
          accessor: (r: SubcontractOrderLineRow) => `${r.quantity.toLocaleString()} ${r.uom}`,
        },
        { id: "fee", header: "Fee/unit", accessor: (r: SubcontractOrderLineRow) => r.processingFeePerUnit != null ? formatMoney(r.processingFeePerUnit, "KES") : "—" },
        { id: "amount", header: "Amount", accessor: (r: SubcontractOrderLineRow) => r.amount != null ? formatMoney(r.amount, "KES") : "—" }
      );
      return cols;
    },
    [order?.status]
  );

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

  const lines = order.lines ?? [];
  const sumByType = (type: SubcontractOrderLineRow["type"], usePlanned: boolean) =>
    lines
      .filter((l) => l.type === type)
      .reduce((a, l) => a + (usePlanned ? (l.plannedQuantity ?? l.quantity) : l.quantity), 0);

  const plannedInputQty = sumByType("INPUT", true);
  const plannedPrimaryQty = sumByType("OUTPUT_PRIMARY", true);
  const plannedSecondaryQty = sumByType("OUTPUT_SECONDARY", true);
  const plannedWasteQty = sumByType("WASTE", true);

  const actualInputQty = sumByType("INPUT", false);
  const actualPrimaryQty = sumByType("OUTPUT_PRIMARY", false);
  const actualSecondaryQty = sumByType("OUTPUT_SECONDARY", false);
  const actualWasteQty = sumByType("WASTE", false);

  const feeLines = lines.filter((line) => line.processingFeePerUnit != null);
  const feeTotal = feeLines.reduce((a, line) => a + (line.amount ?? 0), 0);

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
            {order.status === "SENT" && (
              <Button size="sm" variant="secondary" disabled={dispatching} onClick={handleDispatch}>
                {dispatching ? "Dispatching…" : "Mark as In Processing"}
              </Button>
            )}
            {order.status === "WIP" && (
              <Button size="sm" disabled={receiving} onClick={openReceiveSheet}>
                Receive
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
              <CardContent className="grid gap-4 text-sm md:grid-cols-3 lg:grid-cols-6">
                <div>
                  <p className="text-muted-foreground">Work center</p>
                  <p className="font-medium">{order.workCenterName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Species / Process</p>
                  <p className="font-medium">
                    {order.species ? (order.species === "TILAPIA" ? "Tilapia" : "Nile Perch") : "—"}
                    {order.processType ? ` · ${order.processType}` : ""}
                  </p>
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
                  <p className="text-muted-foreground">Linked PO</p>
                  {order.purchaseOrderId ? (
                    <Link href={`/purchasing/orders/${order.purchaseOrderId}`} className="font-medium font-mono text-xs text-primary underline-offset-2 hover:underline">
                      {order.purchaseOrderId.slice(-12)}
                    </Link>
                  ) : <p className="font-medium">—</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">Linked GRN</p>
                  {order.grnId ? (
                    <Link href={`/inventory/receipts/${order.grnId}`} className="font-medium font-mono text-xs text-primary underline-offset-2 hover:underline">
                      {order.grnId.slice(-12)}
                    </Link>
                  ) : <p className="font-medium">—</p>}
                </div>
              </CardContent>
            </Card>

            {order.status === "RECEIVED" ? (
              <YieldBreakdownCard
                inputKg={actualInputQty}
                primaryKg={actualPrimaryQty}
                secondaryKg={actualSecondaryQty}
                lossKg={actualWasteQty}
                serviceFeeTotal={feeTotal}
                planned={{
                  inputKg: plannedInputQty,
                  primaryKg: plannedPrimaryQty,
                  secondaryKg: plannedSecondaryQty,
                  lossKg: plannedWasteQty,
                }}
                actual={{
                  inputKg: actualInputQty,
                  primaryKg: actualPrimaryQty,
                  secondaryKg: actualSecondaryQty,
                  lossKg: actualWasteQty,
                }}
              />
            ) : (
              <YieldBreakdownCard
                inputKg={plannedInputQty}
                primaryKg={plannedPrimaryQty}
                secondaryKg={plannedSecondaryQty}
                lossKg={plannedWasteQty}
                serviceFeeTotal={feeTotal}
              />
            )}

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
              quantityKg={order.status === "RECEIVED" ? actualInputQty : plannedInputQty}
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Yield Batches</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/manufacturing/yield?subcontractOrderId=${id}`}>Record yield</Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {yieldRecords.length === 0 ? (
                  <p className="text-muted-foreground text-sm p-4">No yield batches recorded yet.</p>
                ) : (
                  <div className="divide-y text-sm">
                    {yieldRecords.map((yr: any) => (
                      <div key={yr.id ?? yr._id} className="grid grid-cols-6 gap-2 px-4 py-3">
                        <div>
                          <p className="text-muted-foreground text-xs">Date</p>
                          <p>{yr.recordedAt ? new Date(yr.recordedAt).toLocaleDateString() : "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Input kg</p>
                          <p>{yr.inputKg ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Primary kg</p>
                          <p>{yr.primaryOutputKg ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Secondary kg</p>
                          <p>{yr.secondaryOutputKg ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Loss kg</p>
                          <p>{yr.processLossKg ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Yield %</p>
                          <p>{yr.primaryYieldPct != null ? `${(yr.primaryYieldPct * 100).toFixed(1)}%` : "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  auditEntries={
                    auditEntries.length > 0
                      ? auditEntries
                      : [{ id: "init", action: "Subcontract order created", user: "System", timestamp: new Date(order.createdAt).toLocaleString(), detail: order.number }]
                  }
                  comments={[]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Sheet open={receiveSheetOpen} onOpenChange={setReceiveSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Receive — enter actual weights</SheetTitle>
            <SheetDescription>
              Input weight is fixed from dispatch. Enter actual primary and secondary output kg; values default to BOM-planned kg. Stock and processing fees use these actuals.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 py-6">
            {(() => {
              const rows = (order.lines ?? []).map((line, i) => ({ line, i }));
              const inputRows = rows.filter((r) => r.line.type === "INPUT");
              const primaryRows = rows.filter((r) => r.line.type === "OUTPUT_PRIMARY");
              const secondaryRows = rows.filter((r) => r.line.type === "OUTPUT_SECONDARY");
              const wasteRows = rows.filter((r) => r.line.type === "WASTE");
              return (
                <>
                  {inputRows.length > 0 ? (
                    <div className="grid gap-3">
                      <h3 className="text-sm font-semibold tracking-tight">Input</h3>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Matches quantity sent to the processor; not editable here.
                      </p>
                      {inputRows.map(({ line, i }) => (
                        <ReceiveWeightRow
                          key={line.id}
                          line={line}
                          lineIndex={i}
                          editable={false}
                          lineActualKg={lineActualKg}
                          setLineActualKg={setLineActualKg}
                        />
                      ))}
                    </div>
                  ) : null}
                  {primaryRows.length > 0 ? (
                    <div className="grid gap-3">
                      <h3 className="text-sm font-semibold tracking-tight">Primary output</h3>
                      {primaryRows.map(({ line, i }) => (
                        <ReceiveWeightRow
                          key={line.id}
                          line={line}
                          lineIndex={i}
                          editable
                          lineActualKg={lineActualKg}
                          setLineActualKg={setLineActualKg}
                        />
                      ))}
                    </div>
                  ) : null}
                  {secondaryRows.length > 0 ? (
                    <div className="grid gap-3">
                      <h3 className="text-sm font-semibold tracking-tight">Secondary output</h3>
                      {secondaryRows.map(({ line, i }) => (
                        <ReceiveWeightRow
                          key={line.id}
                          line={line}
                          lineIndex={i}
                          editable
                          lineActualKg={lineActualKg}
                          setLineActualKg={setLineActualKg}
                        />
                      ))}
                    </div>
                  ) : null}
                  {wasteRows.length > 0 ? (
                    <div className="grid gap-3">
                      <h3 className="text-sm font-semibold tracking-tight">Waste / loss</h3>
                      {wasteRows.map(({ line, i }) => (
                        <ReceiveWeightRow
                          key={line.id}
                          line={line}
                          lineIndex={i}
                          editable
                          lineActualKg={lineActualKg}
                          setLineActualKg={setLineActualKg}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceiveSheetOpen(false)} disabled={receiving}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReceive} disabled={receiving}>
              {receiving ? "Receiving…" : "Confirm receive"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
