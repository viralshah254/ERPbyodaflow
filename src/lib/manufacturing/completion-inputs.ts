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

/** Aggregate requested issues by product and store so duplicate recipe lines share free stock. */
export type IssueShortage = {
  productId: string;
  productName: string;
  productSku?: string;
  barcode?: string;
  warehouseId: string;
  warehouseName?: string;
  needed: number;
  onHand: number;
  short: number;
  uom?: string;
};

function issueStockKey(productId: string, warehouseId: string): string {
  return `${productId}\0${warehouseId}`;
}

export function completionIssueShortages(
  order: ManufacturingWorkOrder,
  actuals: Record<string, { issue: string }>,
  availability: Array<{ productId: string; productName?: string; productSku?: string; barcode?: string; warehouseId?: string; warehouseName?: string; onHandQty: number; uom?: string }>,
): IssueShortage[] {
  const requested = new Map<string, { needed: number; line: ManufacturingWorkOrder["materialLines"][number] }>();
  for (const line of order.materialLines) {
    const key = issueStockKey(line.productId, line.warehouseId);
    const quantity = Number(actuals[line.lineId]?.issue ?? 0);
    const needed = Number.isFinite(quantity) ? quantity : Number.POSITIVE_INFINITY;
    const current = requested.get(key);
    if (current) current.needed += needed;
    else requested.set(key, { needed, line });
  }
  const available = new Map<string, (typeof availability)[number]>();
  for (const row of availability) {
    const key = issueStockKey(row.productId, row.warehouseId ?? "");
    const previous = available.get(key);
    if (!previous || row.onHandQty > previous.onHandQty) available.set(key, row);
  }
  const shortages: IssueShortage[] = [];
  for (const [key, row] of requested) {
    const stock = available.get(key);
    const onHand = stock?.onHandQty ?? 0;
    const short = Math.round((row.needed - onHand) * 1000) / 1000;
    if (!(short > 1e-9)) continue;
    shortages.push({
      productId: row.line.productId,
      productName: row.line.productName || stock?.productName || "Ingredient",
      productSku: row.line.sku || stock?.productSku,
      barcode: row.line.barcode || stock?.barcode,
      warehouseId: row.line.warehouseId,
      warehouseName: row.line.warehouseName || stock?.warehouseName,
      needed: row.needed,
      onHand,
      short,
      uom: row.line.uom || stock?.uom,
    });
  }
  return shortages;
}
