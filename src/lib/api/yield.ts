/**
 * Yield / mass balance API — backend when NEXT_PUBLIC_API_URL set, else mocks.
 * See BACKEND_SPEC_COOL_CATCH.md §3.9.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import {
  getMockYieldRecords,
  getMockMassBalanceReport,
  getMockYieldById,
  type YieldRecordRow,
  type MassBalanceSummaryRow,
} from "@/lib/mock/manufacturing/yield";

export type { YieldRecordRow, MassBalanceSummaryRow };

export async function fetchYieldRecords(params?: {
  workOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<YieldRecordRow[]> {
  if (!isApiConfigured()) return getMockYieldRecords(params);
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
  if (!isApiConfigured()) return getMockYieldById(id);
  try {
    return await apiRequest<YieldRecordRow>(`/api/manufacturing/yield/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchMassBalanceReport(params?: { period?: string }): Promise<MassBalanceSummaryRow[]> {
  if (!isApiConfigured()) return getMockMassBalanceReport(params);
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
  if (!isApiConfigured()) {
    return Promise.resolve({ id: `mock-yield-${Date.now()}` });
  }
  return apiRequest<{ id: string }>("/api/manufacturing/yield", {
    method: "POST",
    body,
  });
}
