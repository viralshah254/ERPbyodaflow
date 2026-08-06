/** Client-side pack price preview (mirrors ERP fmcg-pricing.buildPackPriceMatrix). */

export type PackPreviewRow = { uom: string; unitsPer: number; unitPrice: number };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildPackPriceMatrix(
  pricePerPiece: number,
  packaging: Array<{ uom: string; unitsPer: number }> | undefined | null
): PackPreviewRow[] {
  const piece = Number(pricePerPiece);
  if (!Number.isFinite(piece) || piece < 0) return [];

  const out: PackPreviewRow[] = [{ uom: "PCS", unitsPer: 1, unitPrice: round2(piece) }];
  const seen = new Set(["PCS"]);

  for (const row of packaging ?? []) {
    const uom = String(row.uom ?? "").trim().toUpperCase();
    if (!uom || seen.has(uom)) continue;
    const unitsPer = Number(row.unitsPer);
    if (!Number.isFinite(unitsPer) || unitsPer <= 1) continue;
    seen.add(uom);
    out.push({ uom, unitsPer, unitPrice: round2(piece * unitsPer) });
  }
  return out;
}
