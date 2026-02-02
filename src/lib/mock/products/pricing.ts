/**
 * Mock product pricing (tiers per product + price list).
 */

import type { ProductPrice, PricingTier } from "@/lib/products/pricing-types";

export const MOCK_PRODUCT_PRICES: ProductPrice[] = [
  {
    productId: "p1",
    priceListId: "pl-retail",
    tiers: [
      { minQty: 1, maxQty: 5, price: 120, uom: "EA" },
      { minQty: 6, maxQty: 23, price: 110, uom: "EA" },
      { minQty: 24, price: 2500, uom: "CTN" },
    ],
    startDate: "2025-01-01",
    notes: "Retail list",
  },
  {
    productId: "p1",
    priceListId: "pl-wholesale",
    tiers: [
      { minQty: 1, maxQty: 11, price: 95, uom: "EA" },
      { minQty: 12, price: 1000, uom: "CTN" },
    ],
  },
  {
    productId: "p2",
    priceListId: "pl-retail",
    tiers: [
      { minQty: 1, maxQty: 9, price: 450, uom: "EA" },
      { minQty: 10, price: 400, uom: "EA" },
      { minQty: 12, price: 4500, uom: "CTN" },
    ],
  },
  {
    productId: "p3",
    priceListId: "pl-retail",
    tiers: [{ minQty: 1, price: 85, uom: "KG" }],
  },
];

export function getMockProductPrices(productId?: string, priceListId?: string): ProductPrice[] {
  let out = [...MOCK_PRODUCT_PRICES];
  if (productId) out = out.filter((p) => p.productId === productId);
  if (priceListId) out = out.filter((p) => p.priceListId === priceListId);
  return out;
}

export function getMockTiers(productId: string, priceListId: string): PricingTier[] {
  const pp = getMockProductPrices(productId, priceListId)[0];
  return pp ? [...pp.tiers] : [];
}
