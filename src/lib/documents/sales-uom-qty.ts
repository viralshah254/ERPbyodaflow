/**
 * Prefer sales/document UOM qty (e.g. 1 CARTON).
 * Heals rows where dispatch/pick-pack wrote piece qty but left the pack UOM label.
 */

const PIECE_UOMS = new Set(["PCS", "PC", "EA", "EACH", "PIECE", "UNIT", "RRP"]);

export function resolveSalesUomQty(line: {
  qty?: number;
  uom?: string;
  unitPrice?: number;
  amount?: number;
  tax?: number;
}): number {
  const qty = line.qty ?? 0;
  const unit = String(line.uom ?? "").trim().toUpperCase();
  if (!unit || PIECE_UOMS.has(unit)) return qty;
  const price = line.unitPrice ?? 0;
  const amount = line.amount ?? 0;
  if (!(price > 1e-9 && amount > 1e-9)) return qty;
  // Piece qty left on a pack UOM row (e.g. 24 CARTON after dispatch sync).
  if (qty * price <= amount * 1.5) return qty;
  const approx = amount / price;
  const rounded = Math.round(approx);
  if (rounded > 0 && Math.abs(approx - rounded) < 0.25) return rounded;
  const tax = line.tax ?? 0;
  if (tax > 0) {
    const net = (amount - tax) / price;
    if (net > 1e-9) return Math.round(net * 1000) / 1000;
  }
  const exVat = amount / 1.16 / price;
  const r2 = Math.round(exVat);
  if (r2 > 0 && Math.abs(exVat - r2) < 0.05) return r2;
  return qty;
}

/** Scale a secondary qty field by the same heal factor as the primary qty. */
export function scaleQtyWithHeal(rawQty: number, healedPrimary: number, rawPrimary: number): number {
  if (!(rawPrimary > 1e-9) || !(healedPrimary > 1e-9)) return rawQty;
  if (rawPrimary <= healedPrimary * 1.51) return rawQty;
  const factor = healedPrimary / rawPrimary;
  return Math.round(rawQty * factor * 1000) / 1000;
}
