/** Price-tag discount is stored as 0–100 (20 = 20% off). */

export function parseNumber(raw: string | number | null | undefined): number | undefined {
  if (raw == null) return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[%\s]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Sheets often use 0.5 for 50% off. Values in (0, 1) are treated as fractions;
 * 20 means 20%.
 */
export function parseDiscountPercent(raw: string | number | null | undefined): number | undefined {
  const n = parseNumber(raw);
  if (n == null || n < 0) return undefined;
  const pct = n > 0 && n < 1 ? n * 100 : n;
  if (pct > 100) return undefined;
  return Math.round(pct * 100) / 100;
}

export function finalFromPriceAndDiscount(price: number, discountPercent: number): number {
  const pct = Math.min(100, Math.max(0, discountPercent));
  return Math.round(price * (1 - pct / 100) * 100) / 100;
}

export function discountFromPriceAndFinal(price: number, finalPrice: number): number | undefined {
  if (!(price > 0) || !Number.isFinite(finalPrice) || finalPrice < 0) return undefined;
  const pct = (1 - finalPrice / price) * 100;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return Math.round(pct * 100) / 100;
}

export function formatPriceAmount(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return String(n);
}

/** If the user types 0.5 in Discount %, treat it as 50% once they leave the field. */
export function normalizeDiscountInput(raw: string): string {
  const parsed = parseDiscountPercent(raw);
  if (parsed == null) return raw;
  return parsed === 0 ? "" : formatPriceAmount(parsed);
}

export function resolveImportedDiscount(opts: {
  price: number;
  discountRaw: string;
  finalRaw: string;
}): number | undefined {
  const discount = opts.discountRaw.trim() !== "" ? parseDiscountPercent(opts.discountRaw) : undefined;
  const finalPrice = opts.finalRaw.trim() !== "" ? parseNumber(opts.finalRaw) : undefined;

  if (finalPrice != null && opts.price > 0) {
    const implied = discountFromPriceAndFinal(opts.price, finalPrice);
    if (discount == null) return implied;
    const expectedFinal = finalFromPriceAndDiscount(opts.price, discount);
    if (Math.abs(expectedFinal - finalPrice) <= 0.02) return discount;
    return implied;
  }
  return discount;
}
