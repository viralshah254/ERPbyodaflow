/**
 * Semantic Metrics Engine — METRICS + DIMENSIONS registries.
 * CRITICAL: Defines what can be measured, how, and where to drill.
 */

export type MetricKey =
  | "revenue"
  | "quantity"
  | "cogs"
  | "gross_margin"
  | "gross_margin_pct"
  | "discounts"
  | "landed_cost"
  | "price_realized"
  | "stock_value"
  | "stockout_days"
  | "shrinkage"
  | "ar_overdue"
  | "ap_due"
  | "cash_balance"
  | "payroll_cost"
  | "overtime_cost"
  | "vat"
  | "wht"
  | "fx_impact";

export type DimensionKey =
  | "time"
  | "product"
  | "product_packaging"
  | "customer"
  | "supplier"
  | "warehouse"
  | "branch"
  | "salesperson"
  | "channel"
  | "price_list"
  | "uom"
  | "project"
  | "employee"
  | "entity"
  | "currency";

export type FormatKind = "currency" | "number" | "percent" | "days";
export type VizKind = "bar" | "line" | "table" | "kpi" | "waterfall" | "treemap";

export interface MetricDef {
  key: MetricKey;
  label: string;
  format: FormatKind;
  /** Dimensions this metric can be sliced by */
  allowedDimensions: DimensionKey[];
  defaultVisualization: VizKind;
  /** Where to drill: e.g. "docs/invoice", "master/products" */
  drillTarget: string;
}

export interface DimensionDef {
  key: DimensionKey;
  label: string;
  /** Example values for UX (e.g. time grain) */
  hint?: string;
}

export const METRICS: Record<MetricKey, MetricDef> = {
  revenue: {
    key: "revenue",
    label: "Revenue",
    format: "currency",
    allowedDimensions: ["time", "product", "customer", "branch", "salesperson", "channel", "price_list", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "docs/invoice",
  },
  quantity: {
    key: "quantity",
    label: "Quantity",
    format: "number",
    allowedDimensions: ["time", "product", "product_packaging", "customer", "warehouse", "branch", "uom", "channel", "entity"],
    defaultVisualization: "bar",
    drillTarget: "docs/invoice",
  },
  cogs: {
    key: "cogs",
    label: "Cost of goods sold",
    format: "currency",
    allowedDimensions: ["time", "product", "warehouse", "branch", "supplier", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "inventory/costing",
  },
  gross_margin: {
    key: "gross_margin",
    label: "Gross margin",
    format: "currency",
    allowedDimensions: ["time", "product", "customer", "branch", "channel", "price_list", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "docs/invoice",
  },
  gross_margin_pct: {
    key: "gross_margin_pct",
    label: "Gross margin %",
    format: "percent",
    allowedDimensions: ["time", "product", "customer", "branch", "channel", "price_list", "entity"],
    defaultVisualization: "bar",
    drillTarget: "docs/invoice",
  },
  discounts: {
    key: "discounts",
    label: "Discounts",
    format: "currency",
    allowedDimensions: ["time", "product", "customer", "branch", "salesperson", "channel", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "docs/invoice",
  },
  landed_cost: {
    key: "landed_cost",
    label: "Landed cost",
    format: "currency",
    allowedDimensions: ["time", "product", "warehouse", "supplier", "branch", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "inventory/costing",
  },
  price_realized: {
    key: "price_realized",
    label: "Price realized",
    format: "currency",
    allowedDimensions: ["time", "product", "product_packaging", "customer", "channel", "price_list", "uom", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "docs/invoice",
  },
  stock_value: {
    key: "stock_value",
    label: "Stock value",
    format: "currency",
    allowedDimensions: ["time", "product", "warehouse", "branch", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "inventory/stock-levels",
  },
  stockout_days: {
    key: "stockout_days",
    label: "Stockout days",
    format: "days",
    allowedDimensions: ["time", "product", "warehouse", "branch", "entity"],
    defaultVisualization: "bar",
    drillTarget: "inventory/stock-levels",
  },
  shrinkage: {
    key: "shrinkage",
    label: "Shrinkage",
    format: "currency",
    allowedDimensions: ["time", "product", "warehouse", "branch", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "warehouse/cycle-counts",
  },
  ar_overdue: {
    key: "ar_overdue",
    label: "AR overdue",
    format: "currency",
    allowedDimensions: ["time", "customer", "branch", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "ar/payments",
  },
  ap_due: {
    key: "ap_due",
    label: "AP due",
    format: "currency",
    allowedDimensions: ["time", "supplier", "branch", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "ap/bills",
  },
  cash_balance: {
    key: "cash_balance",
    label: "Cash balance",
    format: "currency",
    allowedDimensions: ["time", "branch", "entity", "currency"],
    defaultVisualization: "kpi",
    drillTarget: "treasury/cashflow",
  },
  payroll_cost: {
    key: "payroll_cost",
    label: "Payroll cost",
    format: "currency",
    allowedDimensions: ["time", "branch", "employee", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "payroll/pay-runs",
  },
  overtime_cost: {
    key: "overtime_cost",
    label: "Overtime cost",
    format: "currency",
    allowedDimensions: ["time", "branch", "employee", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "payroll/pay-runs",
  },
  vat: {
    key: "vat",
    label: "VAT",
    format: "currency",
    allowedDimensions: ["time", "branch", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "reports/vat-summary",
  },
  wht: {
    key: "wht",
    label: "WHT",
    format: "currency",
    allowedDimensions: ["time", "branch", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "reports/wht-summary",
  },
  fx_impact: {
    key: "fx_impact",
    label: "FX impact",
    format: "currency",
    allowedDimensions: ["time", "branch", "entity", "currency"],
    defaultVisualization: "bar",
    drillTarget: "finance/period-close",
  },
};

export const DIMENSIONS: Record<DimensionKey, DimensionDef> = {
  time: { key: "time", label: "Time", hint: "Month, quarter, year" },
  product: { key: "product", label: "Product" },
  product_packaging: { key: "product_packaging", label: "Product packaging" },
  customer: { key: "customer", label: "Customer" },
  supplier: { key: "supplier", label: "Supplier" },
  warehouse: { key: "warehouse", label: "Warehouse" },
  branch: { key: "branch", label: "Branch" },
  salesperson: { key: "salesperson", label: "Salesperson" },
  channel: { key: "channel", label: "Channel" },
  price_list: { key: "price_list", label: "Price list" },
  uom: { key: "uom", label: "UOM" },
  project: { key: "project", label: "Project" },
  employee: { key: "employee", label: "Employee" },
  entity: { key: "entity", label: "Entity" },
  currency: { key: "currency", label: "Currency" },
};

export function getMetric(key: MetricKey): MetricDef {
  return METRICS[key];
}

export function getDimension(key: DimensionKey): DimensionDef {
  return DIMENSIONS[key];
}

export function getAllowedDimensions(metric: MetricKey): DimensionKey[] {
  return METRICS[metric].allowedDimensions;
}
