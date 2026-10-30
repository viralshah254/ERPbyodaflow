/** True when the value is a whole-number item code such as 1 or 53. */
export function isNumericItemCode(value: string | undefined | null): boolean {
  return /^\d+$/.test(String(value ?? "").trim());
}

/** Next integer after the highest numeric code. Does not fill gaps. */
export function nextNumericItemCode(existing: Array<string | undefined | null>): string {
  let max = 0;
  for (const value of existing) {
    const text = String(value ?? "").trim();
    if (!isNumericItemCode(text)) continue;
    max = Math.max(max, Number(text));
  }
  return String(max + 1);
}

/** Item code shown on a sales line. Numeric product code wins over a legacy sku. */
export function displayItemCode(product: { sku?: string; code?: string }): string {
  const code = product.code?.trim() ?? "";
  if (isNumericItemCode(code)) return code;
  return product.sku?.trim() ?? "";
}

export function numericItemCodeSort(product: { sku?: string; code?: string }): number {
  const label = displayItemCode(product);
  return isNumericItemCode(label) ? Number(label) : Number.MAX_SAFE_INTEGER;
}
