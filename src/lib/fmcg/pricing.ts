/**
 * FMCG piece-based pricing helpers (client).
 * Seafood / CoolCatch must not use these for commercial pricing.
 */

import type { ProductPackaging } from "@/lib/products/pricing-types";

export type FmcgCatalogItem = {
  productId: string;
  pricePerPiece: number | null;
  discountPercent?: number;
  packPrices?: Array<{ uom: string; unitsPer: number; unitPrice: number; unitPriceNet?: number }>;
};

function normalizeUom(uom: string | undefined | null): string {
  return String(uom ?? "EA").trim().toUpperCase() || "EA";
}

export function isPieceUom(uom: string): boolean {
  const u = normalizeUom(uom);
  return u === "EA" || u === "PC" || u === "PCS" || u === "PIECE" || u === "RRP" || u === "UNIT";
}

export function resolveUnitsPerPiece(
  uom: string,
  packaging: ProductPackaging[] | undefined,
  productBaseUom?: string
): number {
  const want = normalizeUom(uom);
  if (isPieceUom(want)) return 1;
  const base = normalizeUom(productBaseUom || "EA");
  if (want === base) return 1;
  const rows = packaging ?? [];
  const exact = rows.find((r) => normalizeUom(r.uom) === want);
  if (exact && exact.unitsPer > 0) return exact.unitsPer;
  const aliases: Record<string, string[]> = {
    CTN: ["CTN", "CARTON", "CARTONS", "CS"],
    OUTER: ["OUTER", "OUTERS", "OTR"],
    BALE: ["BALE", "BALES", "BL"],
    PK: ["PK", "PACK", "PACKS"],
  };
  for (const list of Object.values(aliases)) {
    if (!list.includes(want)) continue;
    const hit = rows.find((r) => list.includes(normalizeUom(r.uom)));
    if (hit && hit.unitsPer > 0) return hit.unitsPer;
  }
  return 1;
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
