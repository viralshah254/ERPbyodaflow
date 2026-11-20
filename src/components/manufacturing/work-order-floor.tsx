"use client";
import { Table as InteractiveTable } from "@/components/ui/table";

import * as React from "react";
import { toast } from "sonner";
import { toastStockMoveError } from "@/lib/inventory/opening-cost-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { postWorkOrderMaterials, postWorkOrderOperation, type ManufacturingWorkOrder } from "@/lib/api/manufacturing";
import { storeDisplayName } from "@/lib/warehouse/store-label";

export function WorkOrderFloor({ order, onSaved, storeNames }: { order: ManufacturingWorkOrder; onSaved: (order: ManufacturingWorkOrder) => void; storeNames?: Record<string, string> }) {
  const canQc = useHasPermission("inventory.qc.write");
  const [quantities, setQuantities] = React.useState<Record<string, string>>({});
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const retry = React.useRef<{ fingerprint: string; key: string }>();
  async function materials(action: "issue" | "return") {
    const lines = order.materialLines.map((line) => ({ lineId: line.lineId, quantity: Number(quantities[line.lineId] || 0) })).filter((line) => line.quantity !== 0);
    const fingerprint = JSON.stringify({ action, lines, reason });
    if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    try { onSaved(await postWorkOrderMaterials(order.id, { action, lines, reason, idempotencyKey: retry.current.key })); setQuantities({}); retry.current = undefined; toast.success(action === "issue" ? "Materials issued to floor" : "Original WIP returned; remaining stock reservations released"); }
    catch (error) { toastStockMoveError(error, order.materialLines, "Material posting failed"); } finally { setBusy(false); }
  }
  async function operation(operationId: string, status: "IN_PROGRESS" | "COMPLETED", qcRequired: boolean) {
    setBusy(true);
    try { onSaved(await postWorkOrderOperation(order.id, operationId, { status, qcOutcome: qcRequired ? "ACCEPTED" : undefined, qcReason: reason })); toast.success("Operation updated"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Operation failed"); } finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Floor materials and operations</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Issue materials before production, or return unused material at its original WIP cost. Quantities remain separate by product and unit. Completion can also issue and consume in one posting.</p>
    <InteractiveTable searchable={false} className="min-w-[56rem] text-sm"><thead><tr><th className="whitespace-nowrap text-left">Material / store</th><th className="whitespace-nowrap">Planned</th><th className="whitespace-nowrap">Issued</th><th className="whitespace-nowrap">Consumed</th><th className="whitespace-nowrap">Returned</th><th className="whitespace-nowrap">On floor</th><th className="whitespace-nowrap">Move now</th></tr></thead><tbody>{order.materialLines.map((line) => <tr key={line.lineId}><td className="max-w-[18rem]"><span className="block truncate" title={line.productName || line.productId}>{line.productName || line.productId}</span><span className="block truncate text-muted-foreground">{storeDisplayName(line.warehouseId, line.warehouseName, storeNames)} · {line.uom}</span></td><td className="whitespace-nowrap text-center tabular-nums">{line.plannedQuantity}</td><td className="whitespace-nowrap text-center tabular-nums">{line.issuedQuantity}</td><td className="whitespace-nowrap text-center tabular-nums">{line.consumedQuantity}</td><td className="whitespace-nowrap text-center tabular-nums">{line.returnedQuantity}</td><td className="whitespace-nowrap text-center tabular-nums">{line.issuedQuantity - line.returnedQuantity - line.consumedQuantity}</td><td><Input className="w-28" aria-label={`Move ${line.productName || line.productId}`} type="number" min="0" step="0.001" value={quantities[line.lineId] || ""} onChange={(event) => setQuantities({ ...quantities, [line.lineId]: event.target.value })} /></td></tr>)}</tbody></InteractiveTable>
    <label className="block text-sm">Material movement reason / operation QC finding<Input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <div className="flex flex-wrap gap-2">{order.status !== "COMPLETED" && <Button disabled={busy || !reason.trim()} onClick={() => void materials("issue")}>Issue selected quantities</Button>}<Button variant="outline" disabled={busy || !reason.trim()} onClick={() => void materials("return")}>Return selected quantities</Button></div>
    {(order.operationExecution ?? []).map((step) => <div key={step.operationId} className="flex flex-wrap items-center gap-3 rounded border p-3"><span>{step.order}. {step.name} · {step.workCenter || "No work centre assigned"} · {step.critical ? "Critical" : "Optional"} · {step.status}{step.qcRequired ? " · QC acceptance required" : ""}</span>{order.status !== "COMPLETED" && step.status !== "COMPLETED" && <Button variant="outline" size="sm" disabled={busy || (step.status === "IN_PROGRESS" && step.qcRequired && (!reason.trim() || !canQc))} onClick={() => void operation(step.operationId, step.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED", step.qcRequired)}>{step.status === "PENDING" ? "Start operation" : step.qcRequired ? "Accept QC and complete" : "Complete operation"}</Button>}</div>)}
  </CardContent></Card>;
}
