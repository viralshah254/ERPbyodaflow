/**
 * Analytics Query Contract — Intelligence Operating System.
 * Frontend-only. Mock engine. Architecture must be real.
 */

import type { MetricKey, DimensionKey } from "./semantic";

/** Global filters for Explore (date, branch, entity, currency) */
export interface AnalyticsGlobalFilters {
  dateFrom?: string;
  dateTo?: string;
  branch?: string;
  entity?: string;
  currency?: string;
}

/** Query sent to analytics engine */
export interface AnalyticsQuery {
  metric: MetricKey;
  dimensions: DimensionKey[];
  filters?: AnalyticsGlobalFilters;
  limit?: number;
}

/** Single row from engine */
export interface AnalyticsRow {
  /** Dimension values keyed by dimension (e.g. { time: "2025-01", product: "SKU-001" }) */
  dimensions: Record<string, string>;
  /** Metric value */
  value: number;
  /** Optional prior-period or comparison value */
  prior?: number;
  /** Optional metadata for drill (e.g. document IDs, entity IDs) */
  drillIds?: Record<string, string[]>;
}

/** Result returned by runAnalyticsQuery */
export interface AnalyticsResult {
  query: AnalyticsQuery;
  rows: AnalyticsRow[];
  /** Aggregated total for the metric */
  total: number;
  /** Prior-period total if comparison requested */
  priorTotal?: number;
}

/** Context when user drills into a row (opens DrillDrawer) */
export interface DrillContext {
  query: AnalyticsQuery;
  row: AnalyticsRow;
  /** Target: e.g. "docs/invoice", "master/products", "payroll/pay-runs" */
  drillTarget: string;
  /** Optional pre-filter for drill view */
  drillFilters?: Record<string, string>;
}
