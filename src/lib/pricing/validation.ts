/**
 * Pricing validation: tier overlaps/gaps, inverted tiers, negative margin.
 */

import type { PricingTier, ProductPackaging, PricingValidation } from "@/lib/products/pricing-types";

export function validateTiers(
  tiers: PricingTier[],
  packaging: { uom: string; unitsPer: number; baseUom: string }[],
  options?: { unitCost?: number; baseUom?: string }
): PricingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);

  function effPerBase(t: PricingTier): number | null {
    const p = packaging.find((x) => x.uom === t.uom);
    if (!p || p.unitsPer <= 0) return null;
    return t.price / p.unitsPer;
  }

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]!;
    const next = sorted[i + 1];
    if (curr.minQty > (curr.maxQty ?? Infinity)) {
      errors.push(`Invalid range: min ${curr.minQty} > max ${curr.maxQty ?? "∞"}`);
    }
    if (next) {
      const currMax = curr.maxQty ?? Infinity;
      if (curr.maxQty != null && next.minQty <= curr.maxQty) {
        warnings.push(`Tier overlap: ${curr.minQty}-${curr.maxQty} vs ${next.minQty}-${next.maxQty ?? "∞"}`);
      }
      if (currMax < next.minQty - 1) {
        warnings.push(`Tier gap: ${currMax + 1}–${next.minQty - 1} has no tier`);
      }
    }
  }

  const effPerUnit: { minQty: number; maxQty: number; eff: number }[] = [];
  for (const t of sorted) {
    const e = effPerBase(t);
    if (e != null) effPerUnit.push({ minQty: t.minQty, maxQty: t.maxQty ?? Infinity, eff: e });
  }
  for (let i = 0; i < effPerUnit.length - 1; i++) {
    const curr = effPerUnit[i]!;
    const next = effPerUnit[i + 1]!;
    if (next.eff > curr.eff) {
      warnings.push(`Inverted tier: higher qty (${next.minQty}) costs more per unit than lower qty (${curr.minQty})`);
    }
  }

  if (options?.unitCost != null && options.unitCost > 0) {
    const minEff = Math.min(...effPerUnit.map((x) => x.eff));
    if (minEff < options.unitCost) {
      warnings.push(`Negative margin: min price ${minEff} < unit cost ${options.unitCost}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
