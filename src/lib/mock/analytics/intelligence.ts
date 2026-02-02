/**
 * Mock data for analytics intelligence modules (Week 3).
 */

export interface MarginWaterfallRow {
  stage: string;
  amount: number;
  cumulative: number;
}

export interface PriceLeakageRow {
  productId: string;
  sku: string;
  listPrice: number;
  realizedPrice: number;
  leakagePct: number;
}

export interface TierIntegrityRow {
  productId: string;
  sku: string;
  issue: "inversion" | "gap" | "ok";
  detail: string;
}

export interface PackagingProfitRow {
  productId: string;
  sku: string;
  uom: string;
  marginPct: number;
  volume: number;
}

export interface ChannelMarginRow {
  channel: string;
  revenue: number;
  cogs: number;
  marginPct: number;
}

export interface StockoutCauseRow {
  productId: string;
  sku: string;
  cause: "demand_spike" | "replenishment_delay" | "supplier" | "other";
  daysOut: number;
}

export interface DeadStockRow {
  productId: string;
  sku: string;
  value: number;
  daysSinceMovement: number;
}

export interface ShrinkageVarianceRow {
  period: string;
  expected: number;
  actual: number;
  variancePct: number;
}

export interface CashDriverRow {
  driver: string;
  amount: number;
  changePct: number;
}

export interface ARAgingRow {
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  amount: number;
  count: number;
}

export interface LaborCostDriverRow {
  driver: string;
  amount: number;
  pctOfTotal: number;
}

export interface OvertimeHotspotRow {
  branch: string;
  department: string;
  hours: number;
  cost: number;
}

export const MOCK_MARGIN_WATERFALL: MarginWaterfallRow[] = [
  { stage: "List", amount: 150000, cumulative: 150000 },
  { stage: "Discount", amount: -12000, cumulative: 138000 },
  { stage: "Net", amount: 0, cumulative: 138000 },
  { stage: "Cost", amount: -82800, cumulative: 55200 },
  { stage: "Margin", amount: 0, cumulative: 55200 },
];

export const MOCK_PRICE_LEAKAGE: PriceLeakageRow[] = [
  { productId: "p1", sku: "SKU-001", listPrice: 250, realizedPrice: 220, leakagePct: 12 },
  { productId: "p2", sku: "SKU-002", listPrice: 180, realizedPrice: 165, leakagePct: 8.3 },
  { productId: "p3", sku: "Widget A", listPrice: 320, realizedPrice: 290, leakagePct: 9.4 },
];

export const MOCK_TIER_INTEGRITY: TierIntegrityRow[] = [
  { productId: "p2", sku: "SKU-002", issue: "inversion", detail: "Qty 24 unit price > qty 12" },
  { productId: "p1", sku: "SKU-001", issue: "gap", detail: "No tier for 6–11 units" },
  { productId: "p3", sku: "Widget A", issue: "ok", detail: "—" },
];

export const MOCK_PACKAGING_PROFIT: PackagingProfitRow[] = [
  { productId: "p1", sku: "SKU-001", uom: "EA", marginPct: 38, volume: 1200 },
  { productId: "p1", sku: "SKU-001", uom: "CARTON", marginPct: 42, volume: 80 },
  { productId: "p2", sku: "SKU-002", uom: "EA", marginPct: 28, volume: 900 },
  { productId: "p2", sku: "SKU-002", uom: "BDL", marginPct: 22, volume: 45 },
];

export const MOCK_CHANNEL_MARGIN: ChannelMarginRow[] = [
  { channel: "Direct", revenue: 420000, cogs: 252000, marginPct: 40 },
  { channel: "Retail", revenue: 380000, cogs: 247000, marginPct: 35 },
  { channel: "Wholesale", revenue: 200000, cogs: 140000, marginPct: 30 },
];

export const MOCK_STOCKOUT_CAUSE: StockoutCauseRow[] = [
  { productId: "p1", sku: "SKU-001", cause: "demand_spike", daysOut: 3 },
  { productId: "p3", sku: "Widget A", cause: "replenishment_delay", daysOut: 5 },
  { productId: "p2", sku: "SKU-002", cause: "supplier", daysOut: 2 },
];

export const MOCK_DEAD_STOCK: DeadStockRow[] = [
  { productId: "p4", sku: "SKU-LEGACY", value: 45000, daysSinceMovement: 120 },
  { productId: "p5", sku: "SKU-OLD", value: 22000, daysSinceMovement: 85 },
];

export const MOCK_SHRINKAGE_VARIANCE: ShrinkageVarianceRow[] = [
  { period: "2025-01", expected: 8000, actual: 9200, variancePct: 15 },
  { period: "2024-12", expected: 7500, actual: 7100, variancePct: -5.3 },
];

export const MOCK_CASH_DRIVERS: CashDriverRow[] = [
  { driver: "AR collections", amount: 120000, changePct: 8 },
  { driver: "AP payments", amount: -95000, changePct: -3 },
  { driver: "Payroll", amount: -180000, changePct: 2 },
  { driver: "Inventory", amount: -25000, changePct: -12 },
];

export const MOCK_AR_AGING: ARAgingRow[] = [
  { bucket: "current", amount: 180000, count: 12 },
  { bucket: "1-30", amount: 65000, count: 5 },
  { bucket: "31-60", amount: 32000, count: 3 },
  { bucket: "61-90", amount: 15000, count: 2 },
  { bucket: "90+", amount: 22000, count: 2 },
];

export const MOCK_LABOR_COST_DRIVERS: LaborCostDriverRow[] = [
  { driver: "Base salary", amount: 165000, pctOfTotal: 85 },
  { driver: "Overtime", amount: 15000, pctOfTotal: 7.7 },
  { driver: "Allowances", amount: 12000, pctOfTotal: 6.2 },
  { driver: "Statutory", amount: 8000, pctOfTotal: 4.1 },
];

export const MOCK_OVERTIME_HOTSPOTS: OvertimeHotspotRow[] = [
  { branch: "Nairobi HQ", department: "Warehouse", hours: 42, cost: 8400 },
  { branch: "Mombasa", department: "Sales", hours: 28, cost: 5600 },
  { branch: "Nairobi HQ", department: "Finance", hours: 12, cost: 2400 },
];
