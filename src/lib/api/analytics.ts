/**
 * Analytics API client.
 */

import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { AnalyticsQuery, AnalyticsResult, AnalyticsGlobalFilters } from "@/lib/analytics/types";

export interface AnalyticsSavedViewResponse {
  id: string;
  name: string;
  query: AnalyticsQuery;
  filters?: AnalyticsGlobalFilters;
  createdAt?: string;
  createdBy?: string;
}

export async function fetchAnalyticsSavedViewsApi(): Promise<AnalyticsSavedViewResponse[]> {
  requireLiveApi("Analytics saved views");
  const payload = await apiRequest<{ items: AnalyticsSavedViewResponse[] }>("/api/analytics/saved-views");
  return payload.items ?? [];
}

export async function createAnalyticsSavedViewApi(
  name: string,
  query: AnalyticsQuery,
  filters?: AnalyticsGlobalFilters
): Promise<{ id: string; name: string }> {
  requireLiveApi("Save analytics view");
  return apiRequest<{ id: string; name: string }>("/api/analytics/saved-views", {
    method: "POST",
    body: { name, query, filters },
  });
}

export async function getAnalyticsSavedViewApi(id: string): Promise<AnalyticsSavedViewResponse | null> {
  requireLiveApi("Get analytics saved view");
  const view = await apiRequest<AnalyticsSavedViewResponse>(`/api/analytics/saved-views/${encodeURIComponent(id)}`);
  return view ?? null;
}

export async function runAnalyticsQueryApi(query: AnalyticsQuery): Promise<AnalyticsResult> {
  requireLiveApi("Analytics query");
  return apiRequest<AnalyticsResult>("/api/analytics/query", {
    method: "POST",
    body: query,
  });
}

export async function fetchAnalyticsMetricsApi(): Promise<
  Array<{ key: string; label: string; allowedDimensions: string[] }>
> {
  requireLiveApi("Analytics metrics");
  const payload = await apiRequest<{ items: Array<{ key: string; label: string; allowedDimensions: string[] }> }>(
    "/api/analytics/metrics"
  );
  return payload.items ?? [];
}

export async function validateAnalyticsQueryApi(query: AnalyticsQuery): Promise<void> {
  requireLiveApi("Analytics query validation");
  await apiRequest("/api/analytics/query/validate", {
    method: "POST",
    body: query,
  });
}

export interface InventoryInsightItem {
  type: "low_stock" | string;
  productId?: string;
  warehouseId?: string;
  quantity?: number;
  minThreshold?: number;
  severity?: string;
  title?: string;
  description?: string;
  invoiceId?: string;
  number?: string;
  partyId?: string;
  partyName?: string;
  customerType?: string;
  customerCategory?: string;
  channel?: string;
  creditLimit?: number;
  amount?: number;
  dueDate?: string;
  payRunId?: string;
  totalNet?: number;
  drillPath?: string;
  drillId?: string;
}

export async function fetchAnalyticsInsights(
  module: string
): Promise<{ module: string; data: InventoryInsightItem[] }> {
  requireLiveApi("Analytics insights");
  return apiRequest<{ module: string; data: InventoryInsightItem[] }>(
    `/api/analytics/insights/${encodeURIComponent(module)}`
  );
}

export type SimulationApplyPayload = {
  simulationId: string;
  result: {
    id: string;
    type: "price" | "reorder" | "demand" | "payroll" | "fx";
    impact: Record<string, number>;
    summary: string;
    applied: boolean;
    createdAt: string;
  };
};

export async function applySimulationSuggestionApi(payload: SimulationApplyPayload): Promise<void> {
  requireLiveApi("Apply analytics simulation");
  await apiRequest("/api/analytics/simulations/apply", {
    method: "POST",
    body: payload,
  });
}

