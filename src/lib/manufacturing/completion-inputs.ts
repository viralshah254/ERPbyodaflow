import type { ManufacturingWorkOrder } from "@/lib/api/manufacturing";

/** Suggested actuals are for this posting, rather than the entire open batch. */
export function completionInputDefaults(order: ManufacturingWorkOrder, quantity: number) {
  const ratio = Number.isFinite(quantity) && quantity > 0 ? quantity / (order.quantity || 1) : 0;
  return Object.fromEntries(order.materialLines.map((line) => {
    const remaining = Math.max(0, line.plannedQuantity - line.consumedQuantity);
    const consume = Math.min(remaining, Math.round(line.plannedQuantity * ratio * 1000) / 1000);
    const held = Math.max(0, line.issuedQuantity - line.returnedQuantity - line.consumedQuantity);
    return [line.lineId, { issue: String(Math.max(0, consume - held)), consume: String(consume), returnQty: "0" }];
  }));
}

/** Aggregate requested issues by product/store so duplicate recipe lines share free stock. */
export function completionIssueShortages(order: ManufacturingWorkOrder, actuals: Record<string, { issue: string }>, availability: Array<{ productId: string; warehouseId?: string; onHandQty: number }>) {
  const requested = new Map<string, number>();
  for (const line of order.materialLines) {
    const key = `${line.productId}:${line.warehouseId}`;
    const quantity = Number(actuals[line.lineId]?.issue ?? 0);
    requested.set(key, (requested.get(key) ?? 0) + (Number.isFinite(quantity) ? quantity : Infinity));
  }
  const available = new Map<string, number>();
  for (const line of availability) { const key = `${line.productId}:${line.warehouseId}`; available.set(key, Math.max(available.get(key) ?? 0, line.onHandQty)); }
  return [...requested].filter(([key, quantity]) => quantity > (available.get(key) ?? 0) + 1e-9);
}
