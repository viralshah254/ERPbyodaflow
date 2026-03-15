/**
 * Analytics API client.
 */

import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { AnalyticsQuery, AnalyticsResult } from "@/lib/analytics/types";

export async function runAnalyticsQueryApi(query: AnalyticsQuery): Promise<AnalyticsResult> {
  requireLiveApi("Analytics query");
  return apiRequest<AnalyticsResult>("/api/analytics/query", {
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

