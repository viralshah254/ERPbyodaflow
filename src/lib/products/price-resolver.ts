/**
 * Resolve price + reason for a line (product, price list, qty, UOM).
 */

import type { PricingTier } from "./pricing-types";
import { listProductPrices } from "@/lib/data/products.repo";
import { listPackaging } from "@/lib/data/products.repo";

export interface ResolvedPrice {
  price: number;
  reason: string;
}

export function getPriceForLine(
  productId: string,
  priceListId: string,
  qty: number,
  uom: string
): ResolvedPrice {
  const pp = listProductPrices(productId, priceListId)[0];
  const tiers = pp?.tiers ?? [];
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

export function getBaseQty(productId: string, uom: string, qty: number): number {
  const packaging = listPackaging(productId);
  const p = packaging.find((x) => x.uom === uom);
  if (!p || p.unitsPer <= 0) return qty;
  return qty * p.unitsPer;
}
