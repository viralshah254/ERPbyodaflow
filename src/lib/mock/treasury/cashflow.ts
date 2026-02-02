/**
 * Mock data for /treasury/cashflow (forecast).
 */

export interface CashflowForecastRow {
  id: string;
  date: string;
  description: string;
  type: "receipt" | "payment" | "transfer" | "other";
  inflow: number;
  outflow: number;
  balance: number;
  currency: string;
  sourceDoc?: string;
}

export const MOCK_CASHFLOW: CashflowForecastRow[] = [
  { id: "1", date: "2025-01-28", description: "Opening balance", type: "other", inflow: 0, outflow: 0, balance: 1250000, currency: "KES" },
  { id: "2", date: "2025-01-29", description: "Receipt INV-1", type: "receipt", inflow: 125000, outflow: 0, balance: 1375000, currency: "KES", sourceDoc: "INV-1" },
  { id: "3", date: "2025-01-29", description: "Payment BILL-1", type: "payment", inflow: 0, outflow: 250000, balance: 1125000, currency: "KES", sourceDoc: "BILL-1" },
  { id: "4", date: "2025-01-30", description: "Receipt INV-2", type: "receipt", inflow: 65050, outflow: 0, balance: 1190050, currency: "KES", sourceDoc: "INV-2" },
  { id: "5", date: "2025-02-01", description: "Payroll run", type: "payment", inflow: 0, outflow: 180000, balance: 1010050, currency: "KES" },
];

export function getMockCashflowForecast(filters?: { currency?: string; from?: string; to?: string }): CashflowForecastRow[] {
  let out = [...MOCK_CASHFLOW];
  if (filters?.currency) out = out.filter((r) => r.currency === filters.currency);
  if (filters?.from) out = out.filter((r) => r.date >= filters.from!);
  if (filters?.to) out = out.filter((r) => r.date <= filters.to!);
  return out;
}
