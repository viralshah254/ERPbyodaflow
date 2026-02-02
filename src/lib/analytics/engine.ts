/**
 * Mock Analytics Engine — runAnalyticsQuery returns deterministic data.
 * Replace with real API later. Architecture is real.
 */

import type { AnalyticsQuery, AnalyticsResult, AnalyticsRow } from "./types";
import { getMetric } from "./semantic";
import type { DimensionKey, MetricKey } from "./semantic";

const MOCK_DIM_VALUES: Record<DimensionKey, string[]> = {
  time: ["2025-01", "2025-02", "2024-12", "2024-11"],
  product: ["SKU-001", "SKU-002", "SKU-003", "Widget A", "Widget B"],
  product_packaging: ["EA", "CARTON", "BDL"],
  customer: ["ABC Retail", "XYZ Shop", "Global Distributors"],
  supplier: ["Supplier Alpha", "Supplier Beta"],
  warehouse: ["WH-Main", "WH-East"],
  branch: ["Nairobi HQ", "Mombasa"],
  salesperson: ["Jane", "John"],
  channel: ["Direct", "Retail", "Wholesale"],
  price_list: ["Retail", "Wholesale", "Promo"],
  uom: ["EA", "CTN", "BDL"],
  project: ["P1", "P2"],
  employee: ["Jane Wanjiku", "John Kamau"],
  entity: ["OdaFlow KE", "OdaFlow TZ"],
  currency: ["KES", "USD"],
};

/** Deterministic seed from query for reproducible mock data */
function seedFromQuery(q: AnalyticsQuery): number {
  let h = 0;
  h = (h * 31 + q.metric.length) | 0;
  for (const d of q.dimensions) h = (h * 31 + d.length) | 0;
  return Math.abs(h) % 1e6;
}

function pseudoRandom(seed: number, i: number): number {
  const x = Math.sin(seed * 9999 + i * 12345) * 10000;
  return x - Math.floor(x);
}

function mockValue(metric: MetricKey, seed: number, i: number, prior = false): number {
  const r = pseudoRandom(seed, i);
  const base: Record<MetricKey, number> = {
    revenue: 120000,
    quantity: 500,
    cogs: 72000,
    gross_margin: 48000,
    gross_margin_pct: 40,
    discounts: 6000,
    landed_cost: 75000,
    price_realized: 240,
    stock_value: 450000,
    stockout_days: 2,
    shrinkage: 5000,
    ar_overdue: 45000,
    ap_due: 38000,
    cash_balance: 220000,
    payroll_cost: 180000,
    overtime_cost: 12000,
    vat: 14400,
    wht: 3200,
    fx_impact: -800,
  };
  const b = base[metric] ?? 10000;
  const variation = (r - 0.5) * 0.4 * b;
  const v = Math.round((b + variation) * 100) / 100;
  if (prior) return Math.round(v * 0.92 * 100) / 100;
  return v;
}

export function runAnalyticsQuery(query: AnalyticsQuery): AnalyticsResult {
  const { metric, dimensions, limit = 50 } = query;
  const def = getMetric(metric);
  const seed = seedFromQuery(query);
  const rows: AnalyticsRow[] = [];

  const dims = dimensions.length ? dimensions : (["time"] as DimensionKey[]);
  const keys = dims as DimensionKey[];
  const vals = keys.map((k) => MOCK_DIM_VALUES[k] ?? ["—"]);
  const maxRows = Math.min(limit, vals.reduce((a, v) => a * Math.min(v.length, 5), 1));

  for (let i = 0; i < maxRows; i++) {
    const dimRow: Record<string, string> = {};
    let idx = i;
    for (let j = 0; j < keys.length; j++) {
      const arr = vals[j]!;
      const k = idx % arr.length;
      dimRow[keys[j]!] = arr[k]!;
      idx = Math.floor(idx / arr.length);
    }
    const value = mockValue(metric, seed, i, false);
    const prior = dims.includes("time") ? mockValue(metric, seed, i, true) : undefined;
    rows.push({
      dimensions: dimRow,
      value,
      prior,
      drillIds: { [def.drillTarget]: [`drill-${i + 1}`] },
    });
  }

  const total = rows.reduce((s, r) => s + r.value, 0);
  const priorTotal = rows.some((r) => r.prior != null)
    ? rows.reduce((s, r) => s + (r.prior ?? 0), 0)
    : undefined;

  return { query, rows, total, priorTotal };
}
