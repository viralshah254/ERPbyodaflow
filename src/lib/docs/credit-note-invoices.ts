/** Joy Superbakers: a credit note may use any of the customer's invoices inside this window. */
export const CREDIT_NOTE_INVOICE_WINDOW_DAYS = 30;

export type CreditInvoiceChoice = {
  id: string;
  number: string;
  date: string;
  total: number;
  remaining: number;
  currency: string;
};

function ymdFromUtc(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function parseYmd(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return ymdFromUtc(date) === value.trim() ? value.trim() : null;
}

export function creditInvoiceWindow(creditDate: string): { from: string; to: string } | null {
  const to = parseYmd(creditDate);
  if (!to) return null;
  const start = new Date(Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10))));
  start.setUTCDate(start.getUTCDate() - CREDIT_NOTE_INVOICE_WINDOW_DAYS);
  return { from: ymdFromUtc(start), to };
}

export function invoiceInsideCreditWindow(invoiceDate: string, creditDate: string): boolean {
  const window = creditInvoiceWindow(creditDate);
  const invoice = parseYmd(invoiceDate);
  if (!window || !invoice) return false;
  return invoice >= window.from && invoice <= window.to;
}

export function creditInvoiceCover(rows: Array<{ remaining: number }>): number {
  return Math.round(rows.reduce((sum, row) => sum + (Number.isFinite(row.remaining) ? row.remaining : 0), 0) * 100) / 100;
}

export function creditExceedsInvoiceCover(goodsTotal: number, cover: number): boolean {
  const goods = Math.round((Number.isFinite(goodsTotal) ? goodsTotal : 0) * 100) / 100;
  const room = Math.round((Number.isFinite(cover) ? cover : 0) * 100) / 100;
  return goods > room + 0.009;
}

export function formatCreditInvoiceDate(ymd: string): string {
  const parsed = parseYmd(ymd);
  if (!parsed) return ymd;
  const date = new Date(Date.UTC(Number(parsed.slice(0, 4)), Number(parsed.slice(5, 7)) - 1, Number(parsed.slice(8, 10))));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
