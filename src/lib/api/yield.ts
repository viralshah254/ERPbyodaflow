/**
 * Yield / mass balance API — backend when NEXT_PUBLIC_API_URL set, else mocks.
 * See BACKEND_SPEC_COOL_CATCH.md §3.9.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import {
  buildMassBalanceSummary,
  createYieldRecordEntry,
  getYieldRecordById,
  listYieldRecords,
} from "@/lib/data/yield.repo";

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
  if (!isApiConfigured()) {
    let rows = listYieldRecords();
    if (params?.workOrderId) rows = rows.filter((r) => r.workOrderId === params.workOrderId);
    return rows;
  }
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
  if (!isApiConfigured()) return getYieldRecordById(id);
  try {
    return await apiRequest<YieldRecordRow>(`/api/manufacturing/yield/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchMassBalanceReport(params?: { period?: string }): Promise<MassBalanceSummaryRow[]> {
  if (!isApiConfigured()) {
    return buildMassBalanceSummary(listYieldRecords());
  }
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
    const row = createYieldRecordEntry(body);
    return Promise.resolve({ id: row.id });
  }
  return apiRequest<{ id: string }>("/api/manufacturing/yield", {
    method: "POST",
    body,
  });
}
