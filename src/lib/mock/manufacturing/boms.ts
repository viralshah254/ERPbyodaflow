/**
 * Mock BOMs and BOM items.
 */

import type { BOMRow, BOMItemRow, FormulaCoProduct, FormulaByProduct } from "@/lib/manufacturing/types";

export const MOCK_BOMS: BOMRow[] = [
  {
    id: "bom1",
    code: "BOM-WA",
    name: "Widget A",
    finishedProductId: "p1",
    quantity: 1,
    uom: "EA",
    version: "1",
    isActive: true,
    type: "bom",
  },
  {
    id: "bom2",
    code: "BOM-WB",
    name: "Widget B",
    finishedProductId: "p2",
    quantity: 1,
    uom: "EA",
    version: "1",
    isActive: true,
    type: "bom",
  },
  {
    id: "bom3",
    code: "FML-GAMMA",
    name: "Product Gamma (Formula)",
    finishedProductId: "p3",
    quantity: 100,
    uom: "KG",
    version: "1",
    isActive: true,
    type: "formula",
    batchSize: 100,
    routeId: "route1",
  },
];

export const MOCK_BOM_ITEMS: BOMItemRow[] = [
  { id: "bi1", bomId: "bom1", productId: "p2", quantity: 2, uom: "EA", isOptional: false },
  { id: "bi2", bomId: "bom1", productId: "p3", quantity: 0.5, uom: "KG", isOptional: false, scrapFactor: 2 },
  { id: "bi3", bomId: "bom2", productId: "p3", quantity: 1.2, uom: "KG", isOptional: false },
  { id: "bi4", bomId: "bom3", productId: "p1", quantity: 10, uom: "EA", isOptional: false },
  { id: "bi5", bomId: "bom3", productId: "p2", quantity: 5, uom: "EA", isOptional: true },
];

/** Co-products / by-products per formula BOM (bomId -> extras). */
export const MOCK_FORMULA_EXTRAS: Record<string, { coProducts: FormulaCoProduct[]; byProducts: FormulaByProduct[] }> = {
  bom3: {
    coProducts: [{ productId: "p2", quantity: 8, uom: "EA" }],
    byProducts: [{ productId: "p1", quantity: 2, uom: "EA" }],
  },
};

export function getMockBoms(): BOMRow[] {
  return [...MOCK_BOMS];
}

export function getMockBomById(id: string): BOMRow | undefined {
  return MOCK_BOMS.find((b) => b.id === id);
}

export function getMockBomItems(bomId: string): BOMItemRow[] {
  return MOCK_BOM_ITEMS.filter((i) => i.bomId === bomId);
}

export function getMockFormulaExtras(bomId: string): { coProducts: FormulaCoProduct[]; byProducts: FormulaByProduct[] } {
  return MOCK_FORMULA_EXTRAS[bomId] ?? { coProducts: [], byProducts: [] };
}
