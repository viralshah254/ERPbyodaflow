import { fetchStockLevelsPageApi } from "@/lib/api/inventory-stock";
import type { InputStoreRecommendation, ManufacturingBom } from "@/lib/api/manufacturing";

type Need = { productId: string; productName?: string; requiredQty: number; uom?: string };
type Stock = { warehouseId: string; productId: string; quantity: number };
type StoreChoice = { id: string; code?: string; name?: string };

/** Pick the store that can issue the most of this batch. A line counts only when the store can cover it. */
export function recommendInputStore(needs: Need[], stock: Stock[], stores: StoreChoice[]): InputStoreRecommendation | null {
  const required = needs.filter((need) => need.productId && need.requiredQty > 0);
  if (!required.length || !stores.length) return null;
  const onHand = new Map<string, number>();
  for (const row of stock) {
    const key = `${row.warehouseId}\0${row.productId}`;
    onHand.set(key, (onHand.get(key) ?? 0) + Math.max(0, row.quantity || 0));
  }
  let best: { score: number; ratio: number; code: string; recommendation: InputStoreRecommendation } | null = null;
  for (const store of stores) {
    const lines = required.map((need) => {
      const quantity = onHand.get(`${store.id}\0${need.productId}`) ?? 0;
      return { ...need, onHandQty: Math.round(quantity * 1000) / 1000, covered: quantity + 1e-9 >= need.requiredQty };
    });
    const linesCovered = lines.filter((line) => line.covered).length;
    if (linesCovered === 0) continue;
    const ratio = lines.reduce((sum, line) => sum + Math.min(line.onHandQty, line.requiredQty) / line.requiredQty, 0);
    const code = store.code ?? store.name ?? store.id;
    const recommendation: InputStoreRecommendation = {
      warehouseId: store.id,
      code: store.code,
      name: store.name,
      linesNeeded: required.length,
      linesCovered,
      lines,
    };
    if (!best || linesCovered > best.score || (linesCovered === best.score && (ratio > best.ratio || (ratio === best.ratio && code.localeCompare(best.code) < 0)))) {
      best = { score: linesCovered, ratio, code, recommendation };
    }
  }
  return best?.recommendation ?? null;
}

export async function recommendInputStoreForFormula(bom: ManufacturingBom, quantity: number, stores: StoreChoice[]): Promise<InputStoreRecommendation | null> {
  const batch = bom.quantity > 0 ? bom.quantity : 1;
  const scale = (quantity > 0 ? quantity : 1) / batch;
  const needs = bom.items
    .filter((item) => item.productId && item.quantity > 0 && !item.isOptional)
    .map((item) => ({ productId: item.productId, productName: item.productName || item.productSku, requiredQty: item.quantity * scale, uom: item.uom }));
  if (!needs.length) return null;
  const stock: Stock[] = [];
  const known = new Map(stores.map((store) => [store.id, store]));
  for (const need of needs) {
    let cursor: string | undefined;
    for (let page = 0; page < 5; page += 1) {
      const result = await fetchStockLevelsPageApi({ productId: need.productId, limit: 100, cursor, minOnHand: 0.0001 });
      for (const row of result.items) {
        if (!row.warehouseId || row.warehouseStockBlocked) continue;
        const quantityOnHand = row.available > 0 ? row.available : row.quantity;
        if (!(quantityOnHand > 0)) continue;
        stock.push({ warehouseId: row.warehouseId, productId: need.productId, quantity: quantityOnHand });
        if (!known.has(row.warehouseId)) known.set(row.warehouseId, { id: row.warehouseId, name: row.warehouse });
      }
      if (!result.hasMore || !result.nextCursor) break;
      cursor = result.nextCursor;
    }
  }
  return recommendInputStore(needs, stock, [...known.values()]);
}
