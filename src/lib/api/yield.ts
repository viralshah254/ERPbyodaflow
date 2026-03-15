/**
 * Yield / mass balance API.
 * See BACKEND_SPEC_COOL_CATCH.md §3.9.
 */

import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type YieldRecordRow = {
  id: string;
  workOrderId?: string;
  workOrderNumber?: string;
  subcontractOrderId?: string;
  subcontractOrderNumber?: string;
  batchId?: string;
  inputWeightKg: number;
  outputPrimaryKg: number;
  outputSecondaryKg: number;
  wasteKg: number;
  yieldPercent?: number;
  recordedAt: string;
  lines: Array<{
    id: string;
    skuId: string;
    skuCode: string;
    productName: string;
    type: "PRIMARY" | "SECONDARY" | "WASTE";
    quantityKg: number;
    uom: string;
  }>;
};

export type MassBalanceSummaryRow = {
  id: string;
  period: string;
  workOrderId?: string;
  workOrderNumber?: string;
  subcontractOrderId?: string;
  subcontractOrderNumber?: string;
  inputWeightKg: number;
  outputPrimaryKg: number;
  outputSecondaryKg: number;
  wasteKg: number;
  yieldPercent: number;
  varianceVsBom?: number | null;
};

export async function fetchYieldRecords(params?: {
  workOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<YieldRecordRow[]> {
  requireLiveApi("Yield records");
  const q: Record<string, string> = {};
  if (params?.workOrderId) q.workOrderId = params.workOrderId;
  if (params?.dateFrom) q.dateFrom = params.dateFrom;
  if (params?.dateTo) q.dateTo = params.dateTo;
  const res = await apiRequest<{ items: YieldRecordRow[] }>("/api/manufacturing/yield", {
    params: Object.keys(q).length ? q : undefined,
  });
  return res?.items ?? [];
}

export async function fetchYieldById(id: string): Promise<YieldRecordRow | null> {
  requireLiveApi("Yield record detail");
  try {
    return await apiRequest<YieldRecordRow>(`/api/manufacturing/yield/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchMassBalanceReport(params?: { period?: string }): Promise<MassBalanceSummaryRow[]> {
  requireLiveApi("Mass balance report");
  const q = params?.period ? { period: params.period } : undefined;
  const res = await apiRequest<{ items: MassBalanceSummaryRow[] }>("/api/manufacturing/yield/mass-balance-report", {
    params: q,
  });
  return res?.items ?? [];
}

export interface CreateYieldRequest {
  workOrderId?: string;
  subcontractOrderId?: string;
  inputWeightKg: number;
  lines: { skuId: string; type: "PRIMARY" | "SECONDARY" | "WASTE"; quantityKg: number }[];
}

export async function createYieldRecord(body: CreateYieldRequest): Promise<{ id: string }> {
  requireLiveApi("Create yield record");
  return apiRequest<{ id: string }>("/api/manufacturing/yield", {
    method: "POST",
    body,
  });
}
