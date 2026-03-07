/**
 * Cool Catch / franchise API — uses backend when NEXT_PUBLIC_API_URL is set, else mocks.
 * See docs/COOL_CATCH_API_CONNECT.md for endpoint contract.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import {
  getMockCommissionRules,
  getMockCommissionRuns,
  getMockCommissionRunById,
  getMockTopUps,
  type CommissionRunRow,
  type CommissionRuleRow,
  type TopUpRow,
} from "@/lib/mock/franchise/commission";
import {
  getMockFranchiseeStock,
  getMockVMIReplenishmentOrders,
  getMockVMISuggestions,
  type FranchiseeStockRow,
  type VMIReplenishmentOrderRow,
} from "@/lib/mock/franchise/vmi";
import {
  getMockCashDisbursements,
  getMockCashWeightAuditLines,
  type CashDisbursementRow,
  type CashWeightAuditLineRow,
} from "@/lib/mock/purchasing/cash-weight-audit";
import {
  getMockExternalWorkCenters,
  getMockSubcontractOrders,
  getMockSubcontractOrderById,
  getMockWIPBalances,
  type ExternalWorkCenterRow,
  type SubcontractOrderRow,
  type WIPBalanceRow,
} from "@/lib/mock/manufacturing/subcontracting";

function listParams(p?: Record<string, string | undefined>): Record<string, string> {
  if (!p) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v != null && v !== "") out[k] = v;
  return out;
}

// ——— Commission ———

export async function fetchCommissionRuns(params?: { status?: string }): Promise<CommissionRunRow[]> {
  if (!isApiConfigured()) return getMockCommissionRuns(params);
  const res = await apiRequest<{ items: CommissionRunRow[] }>("/api/franchise/commission/runs", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchCommissionRunById(id: string): Promise<CommissionRunRow | null> {
  if (!isApiConfigured()) return getMockCommissionRunById(id);
  try {
    return await apiRequest<CommissionRunRow>(`/api/franchise/commission/runs/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchCommissionRules(): Promise<CommissionRuleRow[]> {
  if (!isApiConfigured()) return getMockCommissionRules();
  const res = await apiRequest<{ items: CommissionRuleRow[] }>("/api/franchise/commission/rules");
  return res.items ?? [];
}

export async function fetchTopUps(params?: { franchiseeId?: string; runId?: string }): Promise<TopUpRow[]> {
  if (!isApiConfigured()) return getMockTopUps();
  const res = await apiRequest<{ items: TopUpRow[] }>("/api/franchise/commission/top-ups", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function postCommissionRun(id: string): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest(`/api/franchise/commission/runs/${encodeURIComponent(id)}/post`, { method: "POST" });
}

// ——— VMI ———

export async function fetchFranchiseeStock(franchiseeId?: string): Promise<FranchiseeStockRow[]> {
  if (!isApiConfigured()) return getMockFranchiseeStock(franchiseeId);
  const res = await apiRequest<{ items: FranchiseeStockRow[] }>("/api/franchise/vmi/snapshots", {
    params: listParams({ franchiseeId }),
  });
  return res.items ?? [];
}

export async function fetchVMIReplenishmentOrders(params?: {
  franchiseeId?: string;
  status?: string;
}): Promise<VMIReplenishmentOrderRow[]> {
  if (!isApiConfigured()) return getMockVMIReplenishmentOrders(params);
  const res = await apiRequest<{ items: VMIReplenishmentOrderRow[] }>("/api/franchise/vmi/replenishment-orders", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchVMIReplenishmentOrderById(id: string): Promise<VMIReplenishmentOrderRow | null> {
  if (!isApiConfigured()) {
    return getMockVMIReplenishmentOrders().find((o) => o.id === id) ?? null;
  }
  try {
    return await apiRequest<VMIReplenishmentOrderRow>(`/api/franchise/vmi/replenishment-orders/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchVMISuggestions(franchiseeId?: string): Promise<FranchiseeStockRow[]> {
  if (!isApiConfigured()) return getMockVMISuggestions();
  const res = await apiRequest<{ items: FranchiseeStockRow[] }>("/api/franchise/vmi/suggestions", {
    params: listParams({ franchiseeId }),
  });
  return res.items ?? [];
}

export async function confirmReplenishmentOrder(id: string): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest(`/api/franchise/vmi/replenishment-orders/${encodeURIComponent(id)}/confirm`, { method: "POST" });
}

// ——— Cash-to-weight audit ———

export async function fetchCashWeightAuditLines(params?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}): Promise<CashWeightAuditLineRow[]> {
  if (!isApiConfigured()) return getMockCashWeightAuditLines(params);
  const res = await apiRequest<{ items: CashWeightAuditLineRow[] }>("/api/purchasing/cash-weight-audit", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchCashDisbursements(poId?: string): Promise<CashDisbursementRow[]> {
  if (!isApiConfigured()) return getMockCashDisbursements(poId);
  const res = await apiRequest<{ items: CashDisbursementRow[] }>("/api/purchasing/cash-weight-audit/disbursements", {
    params: listParams({ poId }),
  });
  return res.items ?? [];
}

export async function createCashDisbursement(body: {
  poId: string;
  amount: number;
  currency: string;
  paidAt: string;
  reference?: string;
}): Promise<{ id: string }> {
  if (!isApiConfigured()) throw new Error("API not configured");
  return apiRequest<{ id: string }>("/api/purchasing/cash-weight-audit/disbursements", {
    method: "POST",
    body,
  });
}

export async function reconcileCashWeightAudit(body: {
  auditLineId: string;
  disbursementId?: string;
  grnLineId?: string;
  paidWeightKg?: number;
  receivedWeightKg?: number;
}): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest("/api/purchasing/cash-weight-audit/reconcile", { method: "POST", body });
}

// ——— Subcontracting ———

export async function fetchExternalWorkCenters(): Promise<ExternalWorkCenterRow[]> {
  if (!isApiConfigured()) return getMockExternalWorkCenters();
  const res = await apiRequest<{ items: ExternalWorkCenterRow[] }>("/api/manufacturing/work-centers/external");
  return res.items ?? [];
}

export async function fetchSubcontractOrders(params?: {
  workCenterId?: string;
  status?: string;
}): Promise<SubcontractOrderRow[]> {
  if (!isApiConfigured()) return getMockSubcontractOrders(params);
  const res = await apiRequest<{ items: SubcontractOrderRow[] }>("/api/manufacturing/subcontract-orders", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchSubcontractOrderById(id: string): Promise<SubcontractOrderRow | null> {
  if (!isApiConfigured()) return getMockSubcontractOrderById(id);
  try {
    return await apiRequest<SubcontractOrderRow>(`/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchWIPBalances(workCenterId?: string): Promise<WIPBalanceRow[]> {
  if (!isApiConfigured()) return getMockWIPBalances(workCenterId);
  const res = await apiRequest<{ items: WIPBalanceRow[] }>("/api/manufacturing/subcontract-orders/wip", {
    params: listParams({ workCenterId }),
  });
  return res.items ?? [];
}

export async function receiveSubcontractOrder(id: string): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest(`/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}/receive`, { method: "POST" });
}
