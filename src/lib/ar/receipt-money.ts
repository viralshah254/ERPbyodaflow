export function parseReceiptMoney(value: string): number {
  const text = value.trim();
  if (!text) return 0;
  if (!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return NaN;
  const amount = Number(text.replaceAll(",", ""));
  return Number.isSafeInteger(Math.round(amount * 100)) ? amount : NaN;
}

const formatter = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function groupReceiptMoney(value: string): string {
  const amount = parseReceiptMoney(value);
  return value.trim() && Number.isFinite(amount) ? formatter.format(amount) : value;
}
