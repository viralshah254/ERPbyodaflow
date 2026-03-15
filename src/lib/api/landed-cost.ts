/**
 * Landed cost API.
 * See BACKEND_SPEC_COOL_CATCH.md §3.6.
 */

import { apiRequest, requireLiveApi } from "@/lib/api/client";
import {
  type LandedCostTemplateRow,
  type LandedCostSourceRow,
} from "@/lib/mock/inventory/landed-cost";

export type { LandedCostTemplateRow, LandedCostSourceRow };

export async function fetchLandedCostTemplates(): Promise<LandedCostTemplateRow[]> {
  requireLiveApi("Landed cost templates");
  const res = await apiRequest<{ items: LandedCostTemplateRow[] }>("/api/inventory/landed-cost/templates");
  return res?.items ?? [];
}

export async function createLandedCostTemplate(body: {
  name: string;
  type: LandedCostTemplateRow["type"];
  allocationBasis: LandedCostTemplateRow["allocationBasis"];
  currency?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create landed cost template");
  return apiRequest<{ id: string }>("/api/inventory/landed-cost/templates", {
    method: "POST",
    body,
  });
}

export async function fetchLandedCostSources(params?: {
  type?: "grn" | "bill";
  dateFrom?: string;
  dateTo?: string;
}): Promise<LandedCostSourceRow[]> {
  requireLiveApi("Landed cost sources");
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
  requireLiveApi("Landed cost source detail");
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
  requireLiveApi("Landed cost allocation");
  return apiRequest<{ id: string }>("/api/inventory/landed-cost/allocation", {
    method: "POST",
    body,
  });
}
