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
  workCenterId?: string | null;
  workCenterName?: string | null;
  species?: "TILAPIA" | "NILE_PERCH" | null;
  processType?: "FILLETING" | "GUTTING" | null;
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
  workCenterId?: string | null;
  workCenterName?: string | null;
  species?: "TILAPIA" | "NILE_PERCH" | null;
  processType?: "FILLETING" | "GUTTING" | null;
  bomId?: string | null;
  inputWeightKg: number;
  outputPrimaryKg: number;
  outputSecondaryKg: number;
  wasteKg: number;
  processLossKg?: number | null;
  yieldPercent: number;
  /** Tolerance-based alert: OK / WARNING (>5%) / ALERT (>10%) */
  alert?: "OK" | "WARNING" | "ALERT";
  varianceVsBom?: {
    expectedPrimaryKg: number;
    expectedSecondaryKg: number;
    expectedWasteKg: number;
    primaryVarianceKg: number;
    secondaryVarianceKg: number;
    wasteVarianceKg: number;
    primaryVariancePct: number | null;
  } | null;
};

export type YieldListQuery = {
  workOrderId?: string;
  subcontractOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  workCenterId?: string;
  species?: string;
  processType?: string;
  search?: string;
  limit?: number;
  cursor?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor: string | null;
};

function listParams(opts?: YieldListQuery): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.workOrderId) params.workOrderId = opts.workOrderId;
  if (opts?.subcontractOrderId) params.subcontractOrderId = opts.subcontractOrderId;
  if (opts?.dateFrom) params.dateFrom = opts.dateFrom;
  if (opts?.dateTo) params.dateTo = opts.dateTo;
  if (opts?.workCenterId) params.workCenterId = opts.workCenterId;
  if (opts?.species) params.species = opts.species;
  if (opts?.processType) params.processType = opts.processType;
  if (opts?.search?.trim()) params.search = opts.search.trim();
  return params;
}

function parsePage<T>(
  payload: {
    items: T[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  },
  requestedLimit: number,
  cursor?: string
): PaginatedResult<T> {
  const limit = typeof payload.limit === "number" ? payload.limit : requestedLimit;
  const parsedOffset =
    typeof payload.offset === "number" ? payload.offset : cursor ? Number(cursor) || 0 : 0;
  const items = payload.items ?? [];
  const hasMore =
    typeof payload.hasMore === "boolean" ? payload.hasMore : items.length === limit && limit > 0;
  const nextCursor =
    payload.nextCursor != null && String(payload.nextCursor) !== ""
      ? String(payload.nextCursor)
      : hasMore
        ? String(parsedOffset + items.length)
        : null;
  return { items, limit, offset: parsedOffset, hasMore, nextCursor };
}

export async function fetchYieldRecordsPage(opts?: YieldListQuery): Promise<PaginatedResult<YieldRecordRow>> {
  requireLiveApi("Yield records");
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 25;
  const params = listParams(opts);
  params.limit = String(lim);
  if (opts?.cursor) params.cursor = opts.cursor;

  const payload = await apiRequest<{
    items: YieldRecordRow[];
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/manufacturing/yield", { params });

  return parsePage(payload, lim, opts?.cursor);
}

export async function fetchYieldRecords(params?: Omit<YieldListQuery, "limit" | "cursor">): Promise<YieldRecordRow[]> {
  const rows: YieldRecordRow[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const page = await fetchYieldRecordsPage({ ...params, limit: 50, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
}

export type MassBalancePageResult = PaginatedResult<MassBalanceSummaryRow> & {
  summary?: { alertCount: number; warningCount: number };
};

export async function fetchMassBalanceReportPage(opts?: YieldListQuery): Promise<MassBalancePageResult> {
  requireLiveApi("Mass balance report");
  const lim = opts?.limit != null ? Math.min(Math.max(opts.limit, 1), 100) : 25;
  const params = listParams(opts);
  params.limit = String(lim);
  if (opts?.cursor) params.cursor = opts.cursor;

  const payload = await apiRequest<{
    items: MassBalanceSummaryRow[];
    summary?: { alertCount: number; warningCount: number };
    limit?: number;
    offset?: number;
    hasMore?: boolean;
    nextCursor?: string | null;
  }>("/api/manufacturing/yield/mass-balance-report", { params });

  const page = parsePage(payload, lim, opts?.cursor);
  return { ...page, summary: payload.summary };
}

export async function fetchMassBalanceReportWithFilters(params?: {
  period?: string;
  subcontractOrderId?: string;
}): Promise<MassBalanceSummaryRow[]> {
  requireLiveApi("Mass balance report");
  const q: Record<string, string> = {};
  if (params?.period) q.period = params.period;
  if (params?.subcontractOrderId) q.subcontractOrderId = params.subcontractOrderId;
  const res = await apiRequest<{ items: MassBalanceSummaryRow[] }>("/api/manufacturing/yield/mass-balance-report", {
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

export async function fetchMassBalanceReport(
  params?: Omit<YieldListQuery, "limit" | "cursor">
): Promise<MassBalanceSummaryRow[]> {
  const rows: MassBalanceSummaryRow[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const page = await fetchMassBalanceReportPage({ ...params, limit: 50, cursor });
    rows.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return rows;
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
