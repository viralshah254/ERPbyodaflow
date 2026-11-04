import type { ProductionPlanTreeNode } from "@/lib/api/manufacturing";

export type FormulaTotal = { productId: string; productName: string; uom: string; quantity: number };

/** Gross purchased ingredients for the entire formula, before netting intermediate stock.
 * Keep different units separate; never add KG, litres and packs into one number.
 */
export function totalFormulaIngredients(tree: ProductionPlanTreeNode[]): FormulaTotal[] {
  const totals = new Map<string, FormulaTotal>();
  const visit = (node: ProductionPlanTreeNode) => {
    if (node.kind === "buy") {
      const key = JSON.stringify([node.productId, node.uom]);
      const row = totals.get(key) ?? { productId: node.productId, productName: node.productName, uom: node.uom, quantity: 0 };
      row.quantity += node.quantity;
      totals.set(key, row);
    }
    node.children.forEach(visit);
  };
  tree.forEach(visit);
  return [...totals.values()].map((row) => ({ ...row, quantity: Math.round(row.quantity * 1000) / 1000 }))
    .sort((a, b) => a.productName.localeCompare(b.productName) || a.uom.localeCompare(b.uom));
}

export function matchesProductionSearch(row: { productName: string; productSku?: string }, query: string): boolean {
  const text = `${row.productSku ?? ""} ${row.productName}`.toLocaleLowerCase();
  return query.trim().toLocaleLowerCase().split(/\s+/).every((word) => text.includes(word));
}
