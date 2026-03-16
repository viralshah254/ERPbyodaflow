/**
 * Resolve price + reason for a line (product, price list, qty, UOM).
 * Accepts optional preloaded pricing/packaging from API to avoid localStorage.
 */

import type { ProductPackaging, ProductPrice, PricingTier } from "./pricing-types";

export interface ResolvedPrice {
  price: number;
  reason: string;
}

function getTiersFromPricing(pricingForProduct: ProductPrice[] | undefined, priceListId: string): PricingTier[] {
  if (!pricingForProduct?.length) return [];
  const pp = pricingForProduct.find((p) => p.priceListId === priceListId);
  return pp?.tiers ?? [];
}

export function getPriceForLine(
  _productId: string,
  priceListId: string,
  qty: number,
  uom: string,
  pricingForProduct?: ProductPrice[]
): ResolvedPrice {
  const tiers = getTiersFromPricing(pricingForProduct, priceListId);
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (const t of sorted) {
    if (t.uom !== uom) continue;
    const max = t.maxQty ?? Infinity;
    if (qty >= t.minQty && qty <= max) {
      const range = t.maxQty != null ? `${t.minQty}–${t.maxQty}` : `${t.minQty}+`;
      return { price: t.price, reason: `${range} ${t.uom}` };
    }
  }
  const fallback = sorted.find((t) => t.uom === uom);
  if (fallback) return { price: fallback.price, reason: `Default ${fallback.uom}` };
  return { price: 0, reason: "—" };
}

export function getBaseQty(
  _productId: string,
  uom: string,
  qty: number,
  packagingForProduct?: ProductPackaging[]
): number {
  if (!packagingForProduct?.length) return qty;
  const p = packagingForProduct.find((x) => x.uom === uom);
  if (!p || p.unitsPer <= 0) return qty;
  return qty * p.unitsPer;
}
