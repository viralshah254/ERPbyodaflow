export function parseReceiptMoney(value: string): number {
  const text = value.trim().replace(/[\s,]/g, "");
  if (!text) return 0;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return NaN;
  const amount = Number(text);
  if (!Number.isFinite(amount)) return NaN;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents / 100 : NaN;
}

const formatter = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function groupReceiptMoney(value: string): string {
  const amount = parseReceiptMoney(value);
  return value.trim() && Number.isFinite(amount) ? formatter.format(amount) : value;
}
