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
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const prefix = symbols[currencyCode] ?? `${currencyCode} `;
  return `${prefix}${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Convert document-currency amount to base using exchange rate. */
export function toBase(amount: number, exchangeRate: number): number {
  return amount * exchangeRate;
}
