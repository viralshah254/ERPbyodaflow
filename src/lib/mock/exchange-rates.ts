/**
 * Mock exchange rates — get by date, upsert.
 */

export interface ExchangeRateRow {
  id: string;
  date: string;
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  source: "MANUAL" | "API_STUB";
}

type CurrencyCode = string;

const STORAGE_KEY = "odaflow_exchange_rates";

const DEFAULTS: ExchangeRateRow[] = [
  { id: "er1", date: new Date().toISOString().slice(0, 10), from: "USD", to: "KES", rate: 128.5, source: "MANUAL" },
  { id: "er2", date: new Date().toISOString().slice(0, 10), from: "EUR", to: "KES", rate: 140.2, source: "MANUAL" },
  { id: "er3", date: new Date().toISOString().slice(0, 10), from: "GBP", to: "KES", rate: 162.0, source: "MANUAL" },
];

function load(): ExchangeRateRow[] {
  if (typeof window === "undefined") return [...DEFAULTS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULTS];
    const parsed = JSON.parse(raw) as ExchangeRateRow[];
    return Array.isArray(parsed) ? parsed : [...DEFAULTS];
  } catch {
    return [...DEFAULTS];
  }
}

function save(rows: ExchangeRateRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function getMockExchangeRates(params: { date?: string }): ExchangeRateRow[] {
  const all = load();
  if (!params.date) return all;
  return all.filter((r) => r.date === params.date);
}

export function upsertMockExchangeRate(rate: Omit<ExchangeRateRow, "id">): ExchangeRateRow {
  const all = load();
  const existing = all.find(
    (r) => r.date === rate.date && r.from === rate.from && r.to === rate.to
  );
  const row: ExchangeRateRow = existing
    ? { ...existing, ...rate }
    : { ...rate, id: `er-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
  const rest = all.filter((r) => r.id !== row.id);
  save([...rest, row]);
  return row;
}
