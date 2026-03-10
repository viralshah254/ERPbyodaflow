/**
 * Analytics API client.
 * Uses backend when NEXT_PUBLIC_API_URL is set; otherwise falls back to the mock engine.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import type { AnalyticsQuery, AnalyticsResult } from "@/lib/analytics/types";
import { runAnalyticsQuery as runMockAnalyticsQuery } from "@/lib/analytics/engine";

export async function runAnalyticsQueryApi(query: AnalyticsQuery): Promise<AnalyticsResult> {
  if (!isApiConfigured()) {
    // Frontend-only mock engine
    return runMockAnalyticsQuery(query);
  }
  return apiRequest<AnalyticsResult>("/api/analytics/query", {
    method: "POST",
    body: query,
  });
}

export interface InventoryInsightItem {
  type: "low_stock" | string;
  productId: string;
  warehouseId: string;
  quantity: number;
  minThreshold: number;
  drillPath?: string;
  drillId?: string;
}

export async function fetchAnalyticsInsights(
  module: string
): Promise<{ module: string; data: InventoryInsightItem[] }> {
  if (!isApiConfigured()) {
    // No backend yet; return empty so UI can fall back to static cards.
    return { module, data: [] };
  }
  return apiRequest<{ module: string; data: InventoryInsightItem[] }>(
    `/api/analytics/insights/${encodeURIComponent(module)}`
  );
}

