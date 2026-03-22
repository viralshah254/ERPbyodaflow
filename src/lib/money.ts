/**
 * Money formatting and base-currency conversion helpers.
 */

export function formatMoney(
  amount: number,
  currencyCode: string,
  options?: { decimals?: number }
): string {
  const decimals = options?.decimals ?? 2;
  const symbols: Record<string, string> = {
    KES: "KES ",
    UGX: "UGX ",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const prefix = symbols[currencyCode] ?? `${currencyCode} `;
  const safeAmount = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  return `${prefix}${safeAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Convert document-currency amount to base using exchange rate. */
export function toBase(amount: number, exchangeRate: number): number {
  return amount * exchangeRate;
}

/**
 * Return the KES equivalent of an amount in any currency.
 * Returns the amount unchanged if already KES.
 * Returns null if a rate is needed but not provided.
 */
export function kesEquivalent(
  amount: number,
  currency: string,
  exchangeRate?: number
): number | null {
  if (!currency || currency.toUpperCase() === "KES") return amount;
  if (!exchangeRate || exchangeRate <= 0) return null;
  return amount * exchangeRate;
}
