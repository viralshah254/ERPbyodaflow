/**
 * Mock product packaging / UOM conversions.
 */

import type { ProductPackaging } from "@/lib/products/pricing-types";

export const MOCK_PACKAGING: Record<string, ProductPackaging[]> = {
  p1: [
    { uom: "EA", unitsPer: 1, baseUom: "EA", isDefaultSalesUom: true, isDefaultPurchaseUom: true },
    { uom: "CTN", unitsPer: 24, baseUom: "EA", barcode: "1234567890123", dimensions: { l: 40, w: 30, h: 20, unit: "cm" }, weight: { value: 12, unit: "kg" }, isDefaultOrderUom: false, innerPackCount: 6, cartonCount: 4 },
    { uom: "BDL", unitsPer: 6, baseUom: "EA" },
  ],
  p2: [
    { uom: "EA", unitsPer: 1, baseUom: "EA", isDefaultSalesUom: true, isDefaultPurchaseUom: true },
    { uom: "CTN", unitsPer: 12, baseUom: "EA", barcode: "1234567890124" },
  ],
  p3: [
    { uom: "KG", unitsPer: 1, baseUom: "KG", isDefaultSalesUom: true, isDefaultPurchaseUom: true },
    { uom: "BALE", unitsPer: 50, baseUom: "KG", weight: { value: 50, unit: "kg" } },
  ],
};

export function getMockPackaging(productId: string): ProductPackaging[] {
  return [...(MOCK_PACKAGING[productId] ?? [])];
}

export function getMockPackagingBySku(sku: string, productIdMap: Record<string, string>): ProductPackaging[] {
  const id = Object.entries(productIdMap).find(([, s]) => s === sku)?.[0];
  return id ? getMockPackaging(id) : [];
}
