/**
 * FMCG piece-based pricing helpers (client).
 * Seafood / CoolCatch must not use these for commercial pricing.
 */

import type { ProductPackaging } from "@/lib/products/pricing-types";
import {
  isPieceUomCode,
  normalizeAlternateRow,
  normalizeUomCode,
  resolveFactorToBase,
  type SkuAlternateUom,
} from "@/lib/products/sku-uom";

export type FmcgCatalogItem = {
  productId: string;
  pricePerPiece: number | null;
  discountPercent?: number;
  packPrices?: Array<{ uom: string; unitsPer: number; unitPrice: number; unitPriceNet?: number }>;
};

function normalizeUom(uom: string | undefined | null): string {
  return normalizeUomCode(uom) || "EA";
}

export function isPieceUom(uom: string): boolean {
  return isPieceUomCode(uom);
}

function asSkuRows(
  packaging: ProductPackaging[] | undefined,
  productBaseUom?: string
): SkuAlternateUom[] {
  const base = normalizeUom(productBaseUom || "PCS");
  return (packaging ?? [])
    .map((r) => normalizeAlternateRow(r, base))
    .filter((r): r is SkuAlternateUom => r != null);
}

export function resolveUnitsPerPieceOrNull(
  uom: string,
  packaging: ProductPackaging[] | undefined,
  productBaseUom?: string
): number | null {
  const want = normalizeUom(uom);
  const base = normalizeUom(productBaseUom || "PCS");
  if (isPieceUom(want) || want === base) return 1;
  return resolveFactorToBase(want, asSkuRows(packaging, base), base);
}

export function resolveUnitsPerPiece(
  uom: string,
  packaging: ProductPackaging[] | undefined,
  productBaseUom?: string
): number {
  return resolveUnitsPerPieceOrNull(uom, packaging, productBaseUom) ?? 1;
}

/** SKU catalogue count always wins — LPO packing must never redefine conversion. */
export function piecesChargedPerPack(input: {
  unit?: string | null;
  packing?: string | null;
  catalogUnits?: number | null;
}): number {
  const unit = (input.unit ?? "").trim();
  if (!unit || isPieceUom(unit)) return 1;
  const catalog =
    input.catalogUnits != null && Number.isFinite(input.catalogUnits) && input.catalogUnits > 1
      ? input.catalogUnits
      : null;
  if (catalog) return catalog;
  return 1;
}

const PACK_UOM_GROUPS = [
  ["CTN", "CARTON", "CARTONS", "CS"],
  ["OUTER", "OUTERS", "OTR"],
  ["BALE", "BALES", "BL"],
  ["PK", "PACK", "PACKS"],
  ["BOX", "BOXES"],
];

export function catalogUnitsForUom(
  packs: Array<{ uom: string; unitsPer: number }> | undefined,
  unit: string | undefined
): number | null {
  const want = normalizeUom(unit);
  if (!want || isPieceUom(want)) return null;
  const group = PACK_UOM_GROUPS.find((list) => list.includes(want)) ?? [want];
  const hit = (packs ?? []).find((row) => group.includes(normalizeUom(row.uom)));
  return hit && hit.unitsPer > 1 ? hit.unitsPer : null;
}

export function resolveFmcgClientLinePrice(opts: {
  pricePerPiece: number;
  uom: string;
  quantity: number;
  discountPercent?: number;
  packaging?: ProductPackaging[];
  productBaseUom?: string;
}): { unitPriceGross: number; unitPriceNet: number; discountPercent: number; discountAmount: number; unitsPer: number; reason: string } {
  const unitsPer = resolveUnitsPerPiece(opts.uom, opts.packaging, opts.productBaseUom);
  const unitPriceGross = Math.round(opts.pricePerPiece * unitsPer * 100) / 100;
  const discountPercent = Math.min(100, Math.max(0, opts.discountPercent ?? 0));
  const unitPriceNet = Math.round(unitPriceGross * (1 - discountPercent / 100) * 100) / 100;
  const discountAmount = Math.round(unitPriceGross * opts.quantity * (discountPercent / 100) * 100) / 100;
  const reason =
    discountPercent > 0
      ? `${unitsPer} pc × ${opts.pricePerPiece} (−${discountPercent}%)`
      : unitsPer > 1
        ? `${unitsPer} pc × ${opts.pricePerPiece}`
        : "Price / pc";
  return { unitPriceGross, unitPriceNet, discountPercent, discountAmount, unitsPer, reason };
}
