/**
 * Landed cost API — uses backend when NEXT_PUBLIC_API_URL is set, else mocks.
 * See BACKEND_SPEC_COOL_CATCH.md §3.6.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import { saveLandedCostAllocation } from "@/lib/data/inventory-costing.repo";
import {
  getMockLandedCostTemplates,
  getMockLandedCostSources,
  type LandedCostTemplateRow,
  type LandedCostSourceRow,
} from "@/lib/mock/inventory/landed-cost";

export type { LandedCostTemplateRow, LandedCostSourceRow };

export async function fetchLandedCostTemplates(): Promise<LandedCostTemplateRow[]> {
  if (!isApiConfigured()) return getMockLandedCostTemplates();
  const res = await apiRequest<{ items: LandedCostTemplateRow[] }>("/api/inventory/landed-cost/templates");
  return res?.items ?? [];
}

export async function fetchLandedCostSources(params?: {
  type?: "grn" | "bill";
  dateFrom?: string;
  dateTo?: string;
}): Promise<LandedCostSourceRow[]> {
  if (!isApiConfigured()) return getMockLandedCostSources();
  const q: Record<string, string> = {};
  if (params?.type) q.type = params.type;
  if (params?.dateFrom) q.dateFrom = params.dateFrom;
  if (params?.dateTo) q.dateTo = params.dateTo;
  const res = await apiRequest<{ items: LandedCostSourceRow[] }>("/api/inventory/landed-cost/sources", {
    params: Object.keys(q).length ? q : undefined,
  });
  return res?.items ?? [];
}

export async function fetchLandedCostSourceById(id: string): Promise<LandedCostSourceRow | null> {
  if (!isApiConfigured()) {
    const list = getMockLandedCostSources();
    return list.find((s) => s.id === id) ?? null;
  }
  try {
    return await apiRequest<LandedCostSourceRow>(`/api/inventory/landed-cost/sources/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export interface LandedCostAllocationRequest {
  sourceId: string;
  lines: { templateId: string; amount: number; currency: string }[];
}

export async function postLandedCostAllocation(body: LandedCostAllocationRequest): Promise<{ id?: string }> {
  if (!isApiConfigured()) {
    return Promise.resolve({ id: saveLandedCostAllocation(body).id });
  }
  return apiRequest<{ id: string }>("/api/inventory/landed-cost/allocation", {
    method: "POST",
    body,
  });
}
