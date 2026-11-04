"use client";
import { Table as InteractiveTable } from "@/components/ui/table";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { postWorkOrderMaterials, postWorkOrderOperation, type ManufacturingWorkOrder } from "@/lib/api/manufacturing";

export function WorkOrderFloor({ order, onSaved }: { order: ManufacturingWorkOrder; onSaved: (order: ManufacturingWorkOrder) => void }) {
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
    catch (error) { toast.error(error instanceof Error ? error.message : "Material posting failed"); } finally { setBusy(false); }
  }
  async function operation(operationId: string, status: "IN_PROGRESS" | "COMPLETED", qcRequired: boolean) {
    setBusy(true);
    try { onSaved(await postWorkOrderOperation(order.id, operationId, { status, qcOutcome: qcRequired ? "ACCEPTED" : undefined, qcReason: reason })); toast.success("Operation updated"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Operation failed"); } finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Floor materials and operations</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Issue materials before production, or return unused material at its original WIP cost. Quantities remain separate by product and unit. Completion can also issue and consume in one posting.</p>
    <div className="overflow-x-auto"><InteractiveTable className="w-full text-sm"><thead><tr><th className="text-left">Material / store</th><th>Planned</th><th>Issued</th><th>Consumed</th><th>Returned</th><th>On floor</th><th>Move now</th></tr></thead><tbody>{order.materialLines.map((line) => <tr key={line.lineId}><td>{line.productName || line.productId}<br />{line.warehouseName || line.warehouseId} · {line.uom}</td><td className="text-center">{line.plannedQuantity}</td><td className="text-center">{line.issuedQuantity}</td><td className="text-center">{line.consumedQuantity}</td><td className="text-center">{line.returnedQuantity}</td><td className="text-center">{line.issuedQuantity - line.returnedQuantity - line.consumedQuantity}</td><td><Input aria-label={`Move ${line.productName || line.productId}`} type="number" min="0" step="0.001" value={quantities[line.lineId] || ""} onChange={(event) => setQuantities({ ...quantities, [line.lineId]: event.target.value })} /></td></tr>)}</tbody></InteractiveTable></div>
    <label className="block text-sm">Material movement reason / operation QC finding<Input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <div className="flex flex-wrap gap-2">{order.status !== "COMPLETED" && <Button disabled={busy || !reason.trim()} onClick={() => void materials("issue")}>Issue selected quantities</Button>}<Button variant="outline" disabled={busy || !reason.trim()} onClick={() => void materials("return")}>Return selected quantities</Button></div>
    {(order.operationExecution ?? []).map((step) => <div key={step.operationId} className="flex flex-wrap items-center gap-3 rounded border p-3"><span>{step.order}. {step.name} · {step.workCenter || "No work centre assigned"} · {step.critical ? "Critical" : "Optional"} · {step.status}{step.qcRequired ? " · QC acceptance required" : ""}</span>{order.status !== "COMPLETED" && step.status !== "COMPLETED" && <Button variant="outline" size="sm" disabled={busy || (step.status === "IN_PROGRESS" && step.qcRequired && (!reason.trim() || !canQc))} onClick={() => void operation(step.operationId, step.status === "PENDING" ? "IN_PROGRESS" : "COMPLETED", step.qcRequired)}>{step.status === "PENDING" ? "Start operation" : step.qcRequired ? "Accept QC and complete" : "Complete operation"}</Button>}</div>)}
  </CardContent></Card>;
}
