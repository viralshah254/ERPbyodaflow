/**
 * Cool Catch / franchise API.
 * See docs/COOL_CATCH_API_CONNECT.md for endpoint contract.
 */

import { apiRequest, downloadFile, requireLiveApi } from "@/lib/api/client";
import {
  type CommissionRunRow,
  type CommissionRuleRow,
  type TopUpRow,
} from "@/lib/mock/franchise/commission";
import {
  type FranchiseeStockRow,
  type VMIReplenishmentOrderRow,
} from "@/lib/mock/franchise/vmi";
import {
  type CashDisbursementRow,
  type CashWeightAuditLineRow,
} from "@/lib/mock/purchasing/cash-weight-audit";
import {
  type ExternalWorkCenterRow,
  type SubcontractOrderLineRow,
  type SubcontractOrderRow,
  type WIPBalanceRow,
} from "@/lib/mock/manufacturing/subcontracting";

export type { ExternalWorkCenterRow, SubcontractOrderRow, WIPBalanceRow };

function listParams(p?: Record<string, string | undefined>): Record<string, string> {
  if (!p) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v != null && v !== "") out[k] = v;
  return out;
}

export interface CommissionSummaryRow {
  franchiseeId: string;
  franchiseeCode: string;
  franchiseeName: string;
  runs: number;
  salesAmount: number;
  commissionAmount: number;
  topUpAmount: number;
  totalPayout: number;
}

export interface FranchiseNetworkOutletRow {
  id: string;
  membershipId?: string;
  networkId?: string;
  name: string;
  code?: string;
  territory?: string;
  storeFormat?: string;
  managerName?: string;
  agreementStatus?: string;
  isActive: boolean;
  revenue: number;
  invoiceCount: number;
  arOverdue: number;
  totalStockQty: number;
  lowStockCount: number;
  orgType?: string;
  /** HQ security deposit (when configured): KES amount and receipt status */
  securityDepositAmountKes?: number | null;
  securityDepositChargeDocumentId?: string | null;
  securityDepositChargePostedAt?: string | null;
  securityDepositPaidAt?: string | null;
  /** HQ franchisee registry id for commission economics / rules */
  franchiseeRegistryId?: string;
  /** GPS coordinates for nearest-outlet routing (WhatsApp commerce). */
  latitude?: number;
  longitude?: number;
  weeklySalesTargetValueKes?: number | null;
  weeklySalesTargetKg?: number | null;
  /** Smart stock-take compliance for the current ISO week. */
  weeklyStockTakeStatus?: "ok" | "due" | "overdue" | "none";
  lastStockTakeSubmittedAt?: string | null;
}

export interface FranchiseNetworkSummary {
  parentOrgId: string;
  outletCount: number;
  activeOutletCount: number;
  networkSales: number;
  networkInvoices: number;
  stockRiskOutlets: number;
  arOverdue: number;
  totalStockQty: number;
  totalCommission: number;
  topUpExposure: number;
  generatedAt: string;
  outlets: FranchiseNetworkOutletRow[];
}

export interface FranchiseOutletWorkspace {
  salesToday: number;
  monthlySales: number;
  openSalesOrders: number;
  openBills: number;
  stockSkuCount: number;
  lowStockCount: number;
  lowStockItems: Array<{ productId: string; productName: string | null; warehouseId: string; warehouseName: string | null; quantity: number; uom: string | null }>;
  recentInvoices: Array<{ id: string; number: string; total: number; date: string; status: string }>;
}

// ——— Commission ———

export async function fetchCommissionRuns(params?: { status?: string }): Promise<CommissionRunRow[]> {
  requireLiveApi("Commission runs");
  const res = await apiRequest<{ items: CommissionRunRow[] }>("/api/franchise/commission/runs", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchFranchiseNetworkSummary(): Promise<FranchiseNetworkSummary> {
  requireLiveApi("Franchise network summary");
  return apiRequest<FranchiseNetworkSummary>("/api/franchise/network/summary");
}

export async function fetchFranchiseNetworkOutlets(): Promise<FranchiseNetworkOutletRow[]> {
  requireLiveApi("Franchise network outlets");
  const payload = await apiRequest<{ items: FranchiseNetworkOutletRow[] }>("/api/franchise/network/outlets");
  return payload.items ?? [];
}

export async function fetchFranchiseNetworkOutletById(outletRef: string): Promise<FranchiseNetworkOutletRow | null> {
  requireLiveApi("Franchise network outlet");
  try {
    return await apiRequest<FranchiseNetworkOutletRow>(`/api/franchise/network/outlets/${encodeURIComponent(outletRef)}`);
  } catch {
    return null;
  }
}

export async function updateOutletGeoApi(
  outletOrgId: string,
  payload: { latitude?: number | null; longitude?: number | null }
): Promise<{ id: string; latitude?: number; longitude?: number }> {
  requireLiveApi("Update outlet GPS");
  return apiRequest(`/api/franchise/network/outlets/${encodeURIComponent(outletOrgId)}/geo`, {
    method: "PATCH",
    body: payload,
  });
}

export type CreateFranchiseOutletPayload = {
  name: string;
  outletCode: string;
  adminEmail: string;
  initialPassword: string;
  territory?: string;
  storeFormat?: string;
  managerName?: string;
  managerPhone?: string;
  firstName?: string;
  lastName?: string;
};

export type CreateFranchiseOutletResult = {
  id: string;
  userId: string | null;
  outletCode?: string;
  adminEmail: string;
  activated?: boolean;
  message?: string;
};

export async function fetchNextOutletCodeApi(): Promise<string> {
  requireLiveApi("Outlet code preview");
  const data = await apiRequest<{ code: string }>("/api/franchise/network/outlets/next-code");
  return data.code;
}

export async function createFranchiseOutletApi(body: CreateFranchiseOutletPayload): Promise<CreateFranchiseOutletResult> {
  requireLiveApi("Create franchise outlet");
  return apiRequest<CreateFranchiseOutletResult>("/api/franchise/network/outlets", {
    method: "POST",
    body,
  });
}

export type RepairFranchiseeRegistryItem = {
  childOrgId: string;
  outletCode: string | null;
  status: "linked" | "skipped_no_party" | "skipped_no_org" | "error";
  message?: string;
  franchiseeId?: string;
};

export async function repairFranchiseeRegistryApi(body?: {
  childOrgId?: string;
}): Promise<{ items: RepairFranchiseeRegistryItem[] }> {
  requireLiveApi("Repair franchisee registry");
  return apiRequest("/api/franchise/network/outlets/repair-franchisee-registry", {
    method: "POST",
    body: body ?? {},
  });
}

export async function fetchFranchiseOutletWorkspace(): Promise<FranchiseOutletWorkspace> {
  requireLiveApi("Franchise outlet workspace");
  return apiRequest<FranchiseOutletWorkspace>("/api/franchise/outlet/workspace");
}

export async function fetchFranchiseOutletHqSupplier(): Promise<{ id: string; name: string }> {
  requireLiveApi("Franchise HQ supplier");
  return apiRequest<{ id: string; name: string }>("/api/franchise/outlet/hq-supplier");
}

export async function fetchCommissionRunById(id: string): Promise<CommissionRunRow | null> {
  requireLiveApi("Commission run detail");
  try {
    return await apiRequest<CommissionRunRow>(`/api/franchise/commission/runs/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchCommissionRules(): Promise<CommissionRuleRow[]> {
  requireLiveApi("Commission rules");
  const res = await apiRequest<{ items: CommissionRuleRow[] }>("/api/franchise/commission/rules");
  return res.items ?? [];
}

export async function fetchTopUps(params?: { franchiseeId?: string; runId?: string }): Promise<TopUpRow[]> {
  requireLiveApi("Commission top-ups");
  const res = await apiRequest<{ items: TopUpRow[] }>("/api/franchise/commission/top-ups", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchCommissionSummary(params?: {
  dateFrom?: string;
  dateTo?: string;
  status?: "DRAFT" | "POSTED" | "ALL";
  franchiseeId?: string;
}): Promise<{
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  items: CommissionSummaryRow[];
  totalCommission: number;
  totalTopUp: number;
  totalPayout: number;
}> {
  requireLiveApi("Commission summary");
  const { status, ...rest } = params ?? {};
  const query = listParams({
    ...rest,
    ...(status && status !== "ALL" ? { status } : {}),
  });
  return apiRequest("/api/reports/cool-catch/commission-summary", {
    params: query,
  });
}

export async function postCommissionRun(id: string): Promise<void> {
  requireLiveApi("Post commission run");
  await apiRequest(`/api/franchise/commission/runs/${encodeURIComponent(id)}/post`, { method: "POST" });
}

/** Auto-calculate commission run from posted invoices for the period. Body: { periodStart, periodEnd }. */
export async function calculateCommissionRun(body: { periodStart: string; periodEnd: string }): Promise<CommissionRunRow> {
  requireLiveApi("Calculate commission run");
  const res = await apiRequest<CommissionRunRow>("/api/franchise/commission/runs/calculate", { method: "POST", body });
  return res;
}

/** Manual create commission run. Body: { periodStart, periodEnd, lines? }. */
export async function createCommissionRun(body: {
  periodStart: string;
  periodEnd: string;
  lines?: { franchiseeId: string; salesAmount?: number; commissionAmount?: number }[];
}): Promise<CommissionRunRow> {
  requireLiveApi("Create commission run");
  const res = await apiRequest<CommissionRunRow>("/api/franchise/commission/runs", { method: "POST", body });
  return res;
}

/** HQ franchise franchisee records (for royalty / commission linkage). */
export type FranchiseeRow = {
  id: string;
  customerId: string;
  code: string;
  name: string;
  monthlyRoyaltyKes?: number | null;
  royaltyStartsOn?: string | null;
  outletOrgId?: string | null;
  segment?: string;
  isActive?: boolean;
};

export async function fetchFranchiseesApi(): Promise<FranchiseeRow[]> {
  requireLiveApi("Franchisees");
  const res = await apiRequest<{ items: FranchiseeRow[] }>("/api/franchise/franchisees");
  return res.items ?? [];
}

export async function patchFranchiseeApi(
  id: string,
  body: Partial<{
    customerId: string;
    code: string;
    name: string;
    monthlyRoyaltyKes: number | null;
    royaltyStartsOn: string | null;
    minCommissionFloor: number;
    outletOrgId: string | null;
    isActive: boolean;
  }>
): Promise<void> {
  requireLiveApi("Update franchisee");
  await apiRequest(`/api/franchise/franchisees/${encodeURIComponent(id)}`, { method: "PATCH", body });
}

export async function createFranchiseeApi(body: {
  customerId: string;
  code: string;
  name: string;
  outletOrgId?: string | null;
  segment?: "HIGH_VALUE" | "STANDARD" | "VALUE";
  monthlyRoyaltyKes?: number;
  royaltyStartsOn?: string | null;
  isActive?: boolean;
}): Promise<{ id: string }> {
  requireLiveApi("Create franchisee");
  return apiRequest("/api/franchise/franchisees", { method: "POST", body });
}

export type FranchiseeProductEconomicsRow = {
  id: string;
  productId: string;
  supplyBasePrice: number;
  commissionPerUnit: number;
  guideRetail: number;
};

export async function fetchFranchiseeProductEconomicsApi(franchiseeId: string): Promise<FranchiseeProductEconomicsRow[]> {
  requireLiveApi("Franchisee product economics");
  const res = await apiRequest<{ items: FranchiseeProductEconomicsRow[] }>(
    `/api/franchise/franchisees/${encodeURIComponent(franchiseeId)}/product-economics`
  );
  return res.items ?? [];
}

export async function putFranchiseeProductEconomicsApi(
  franchiseeId: string,
  items: Array<{ productId: string; supplyBasePrice: number; commissionPerUnit: number }>
): Promise<FranchiseeProductEconomicsRow[]> {
  requireLiveApi("Update franchisee product economics");
  const res = await apiRequest<{ items: FranchiseeProductEconomicsRow[] }>(
    `/api/franchise/franchisees/${encodeURIComponent(franchiseeId)}/product-economics`,
    { method: "PUT", body: { items } }
  );
  return res.items ?? [];
}

export type RoyaltyChargeRow = {
  id: string;
  orgId?: string;
  franchiseeId: string;
  periodYear: number;
  periodMonth: number;
  amountKes: number;
  invoiceDocumentId?: string;
  settledKes?: number;
  status: string;
};

export async function fetchRoyaltyChargesApi(params?: {
  franchiseeId?: string;
  periodYear?: number;
  periodMonth?: number;
}): Promise<RoyaltyChargeRow[]> {
  requireLiveApi("Royalty charges");
  const q = listParams({
    ...(params?.franchiseeId !== undefined ? { franchiseeId: params.franchiseeId } : {}),
    ...(params?.periodYear !== undefined ? { periodYear: String(params.periodYear) } : {}),
    ...(params?.periodMonth !== undefined ? { periodMonth: String(params.periodMonth) } : {}),
  });
  const res = await apiRequest<{ items: RoyaltyChargeRow[] }>("/api/franchise/royalties", { params: q });
  return res.items ?? [];
}

export async function fetchRoyaltySummaryApi(franchiseeId: string): Promise<{
  outstandingKes: number;
  invoicedCount: number;
  settledViaCommissionKes: number;
}> {
  requireLiveApi("Royalty summary");
  return apiRequest(`/api/franchise/royalties/summary/${encodeURIComponent(franchiseeId)}`);
}

export type RoyaltyMonthRunResultRow = {
  franchiseeId: string;
  chargeId?: string;
  invoiceId?: string;
  skipped?: string;
  error?: string;
};

export async function runRoyaltiesMonthApi(body?: { year?: number; month?: number }): Promise<{
  year: number;
  month: number;
  results: RoyaltyMonthRunResultRow[];
}> {
  requireLiveApi("Run royalty invoicing month");
  return apiRequest("/api/franchise/royalties/run-month", { method: "POST", body: body ?? {} });
}

// ——— VMI ———

export async function fetchFranchiseeStock(franchiseeId?: string): Promise<FranchiseeStockRow[]> {
  requireLiveApi("Franchisee stock");
  const res = await apiRequest<{ items: FranchiseeStockRow[] }>("/api/franchise/vmi/snapshots", {
    params: listParams({ franchiseeId }),
  });
  return res.items ?? [];
}

export async function fetchVMIReplenishmentOrders(params?: {
  franchiseeId?: string;
  status?: string;
}): Promise<VMIReplenishmentOrderRow[]> {
  requireLiveApi("VMI replenishment orders");
  const res = await apiRequest<{ items: VMIReplenishmentOrderRow[] }>("/api/franchise/vmi/replenishment-orders", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchVMIReplenishmentOrderById(id: string): Promise<VMIReplenishmentOrderRow | null> {
  requireLiveApi("VMI replenishment order detail");
  try {
    return await apiRequest<VMIReplenishmentOrderRow>(`/api/franchise/vmi/replenishment-orders/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchVMISuggestions(franchiseeId?: string): Promise<FranchiseeStockRow[]> {
  requireLiveApi("VMI suggestions");
  const res = await apiRequest<{ items: FranchiseeStockRow[] }>("/api/franchise/vmi/suggestions", {
    params: listParams({ franchiseeId }),
  });
  return res.items ?? [];
}

export async function confirmReplenishmentOrder(id: string): Promise<void> {
  requireLiveApi("Confirm replenishment order");
  await apiRequest(`/api/franchise/vmi/replenishment-orders/${encodeURIComponent(id)}/confirm`, { method: "POST" });
}

/** Auto-create replenishment orders from suggestions (reorder points). Body: { sourceWarehouseId?, franchiseeId? }. */
export async function autoReplenish(body?: { sourceWarehouseId?: string; franchiseeId?: string }): Promise<{ created: number; orderIds?: string[] }> {
  requireLiveApi("Auto-replenish");
  const res = await apiRequest<{ created: number; orderIds?: string[] }>("/api/franchise/vmi/auto-replenish", {
    method: "POST",
    body: body ?? {},
  });
  return res;
}

/** Upsert VMI snapshots from each linked outlet's posted StockLevel (same HQ org). */
export async function syncVmIFranchiseSnapshotsFromLedger(body?: {
  franchiseeId?: string;
  warehouseId?: string;
}): Promise<{ ok: boolean; franchiseesProcessed: number; snapshotRowsUpserted: number }> {
  requireLiveApi("Sync VMI from ledger");
  return apiRequest<{ ok: boolean; franchiseesProcessed: number; snapshotRowsUpserted: number }>(
    "/api/franchise/vmi/sync-from-ledger",
    {
      method: "POST",
      body: body ?? {},
    }
  );
}

export async function fetchCashWeightAuditLines(params?: {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}): Promise<CashWeightAuditLineRow[]> {
  requireLiveApi("Cash-weight audit lines");
  const res = await apiRequest<{ items: CashWeightAuditLineRow[] }>("/api/purchasing/cash-weight-audit", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchCashWeightExceptions(params?: {
  status?: "OPEN" | "INVESTIGATING" | "APPROVED" | "RESOLVED";
}): Promise<CashWeightAuditLineRow[]> {
  requireLiveApi("Cash-weight audit exceptions");
  const res = await apiRequest<{ items: CashWeightAuditLineRow[] }>("/api/purchasing/cash-weight-audit/exceptions", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function assignCashWeightException(auditLineId: string, assignedToUserId?: string): Promise<void> {
  requireLiveApi("Assign cash-weight exception");
  await apiRequest(`/api/purchasing/cash-weight-audit/exceptions/${encodeURIComponent(auditLineId)}/assign`, {
    method: "PATCH",
    body: { assignedToUserId },
  });
}

export async function investigateCashWeightException(auditLineId: string, investigationNotes: string): Promise<void> {
  requireLiveApi("Investigate cash-weight exception");
  await apiRequest(`/api/purchasing/cash-weight-audit/exceptions/${encodeURIComponent(auditLineId)}/investigate`, {
    method: "PATCH",
    body: { investigationNotes },
  });
}

export async function approveCashWeightException(auditLineId: string): Promise<void> {
  requireLiveApi("Approve cash-weight exception");
  await apiRequest(`/api/purchasing/cash-weight-audit/exceptions/${encodeURIComponent(auditLineId)}/approve`, {
    method: "PATCH",
  });
}

export async function resolveCashWeightException(auditLineId: string, resolutionNotes: string): Promise<void> {
  requireLiveApi("Resolve cash-weight exception");
  await apiRequest(`/api/purchasing/cash-weight-audit/exceptions/${encodeURIComponent(auditLineId)}/resolve`, {
    method: "PATCH",
    body: { resolutionNotes },
  });
}

export async function fetchCashDisbursements(poId?: string): Promise<CashDisbursementRow[]> {
  requireLiveApi("Cash disbursements");
  const res = await apiRequest<{ items: CashDisbursementRow[] }>("/api/purchasing/cash-weight-audit/disbursements", {
    params: listParams({ poId }),
  });
  return res.items ?? [];
}

/** Download supplier invoice / receipt attached to a cash disbursement. */
export function downloadCashDisbursementInvoice(
  disbursementId: string,
  onNotAvailable: (message: string) => void
): Promise<void> {
  requireLiveApi("Disbursement invoice");
  return downloadFile(
    `/api/purchasing/cash-weight-audit/disbursements/${encodeURIComponent(disbursementId)}/invoice`,
    `cod-invoice-${disbursementId}`,
    onNotAvailable
  );
}

export async function createCashDisbursement(body: {
  poId: string;
  /** Optional: single GRN this payment is associated with (legacy; prefer grnIds). */
  grnId?: string;
  /** All GRN IDs covered by this disbursement when paying on GRN basis. */
  grnIds?: string[];
  amount: number;
  currency: string;
  paidAt: string;
  reference?: string;
  paidWeightKg?: number;
  /** Per-line paid weight for multi-line POs. poLineId format: `${poId}:${lineIndex}` */
  lines?: { poLineId: string; paidWeightKg: number }[];
  paymentMethod?: string;
  /** Base64 file content (no data: prefix); optional supplier invoice / receipt. */
  invoiceAttachment?: { fileName: string; contentType?: string; content: string };
}): Promise<{ id: string; reference: string; warnings?: string[] }> {
  requireLiveApi("Create cash disbursement");
  return apiRequest<{ id: string; reference: string; warnings?: string[] }>("/api/purchasing/cash-weight-audit/disbursements", {
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
  /** Approved override-request approval ID; required when changing weights without the override permission. */
  overrideApprovalId?: string;
}): Promise<void> {
  requireLiveApi("Reconcile cash-weight audit");
  await apiRequest("/api/purchasing/cash-weight-audit/reconcile", { method: "POST", body });
}

/**
 * Submit a weight correction override request for admin approval.
 * Required when the current user lacks `purchasing.audit.override`.
 */
export async function requestAuditWeightOverride(body: {
  auditLineId: string;
  paidWeightKg?: number;
  receivedWeightKg?: number;
  reason: string;
}): Promise<{ id: string; documentNumber: string; status: string }> {
  requireLiveApi("Request audit weight override");
  return apiRequest<{ id: string; documentNumber: string; status: string }>(
    "/api/purchasing/cash-weight-audit/override-request",
    { method: "POST", body }
  );
}

/** Build audit lines from PO + Cash disbursements + GRN. Body: { poId?, dateFrom?, dateTo? }. */
export async function buildCashWeightAudit(body?: { poId?: string; dateFrom?: string; dateTo?: string }): Promise<{ built: number }> {
  requireLiveApi("Build cash-weight audit");
  const res = await apiRequest<{ built?: number; count?: number; created?: string[] }>("/api/purchasing/cash-weight-audit/build", {
    method: "POST",
    body: body ?? {},
  });
  return { built: Number(res.built ?? res.count ?? res.created?.length ?? 0) };
}

export async function fetchCashWeightAuditSummary(): Promise<{
  summary: {
    totalLines: number;
    matchedCount: number;
    varianceCount: number;
    pendingCount: number;
    absoluteVarianceKg: number;
    netVarianceKg: number;
  };
}> {
  requireLiveApi("Cash-weight audit summary");
  return apiRequest("/api/purchasing/cash-weight-audit/summary");
}

/** Export cash-weight audit lines as CSV. */
export function exportCashWeightAuditCsv(
  params?: { dateFrom?: string; dateTo?: string },
  onNotAvailable?: (message: string) => void
): void {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params?.dateTo) q.set("dateTo", params.dateTo);
  q.set("format", "csv");
  const path = `/api/purchasing/cash-weight-audit/export?${q.toString()}`;
  downloadFile(path, `cash-weight-audit-${new Date().toISOString().slice(0, 10)}.csv`, onNotAvailable ?? (() => {}));
}

// ——— Subcontracting ———

export async function fetchExternalWorkCenters(): Promise<ExternalWorkCenterRow[]> {
  requireLiveApi("External work centers");
  const res = await apiRequest<{ items: ExternalWorkCenterRow[] }>("/api/manufacturing/work-centers/external");
  return res.items ?? [];
}

/** Create external work center (factory, women's group). */
export async function createExternalWorkCenter(body: {
  code: string;
  name: string;
  type: ExternalWorkCenterRow["type"];
  address?: string;
  isActive?: boolean;
}): Promise<ExternalWorkCenterRow> {
  requireLiveApi("Create external work center");
  const res = await apiRequest<ExternalWorkCenterRow>("/api/manufacturing/work-centers/external", {
    method: "POST",
    body,
  });
  return res;
}

export async function fetchSubcontractOrders(params?: {
  workCenterId?: string;
  status?: string;
  species?: string;
  processType?: string;
  purchaseOrderId?: string;
  grnId?: string;
}): Promise<SubcontractOrderRow[]> {
  requireLiveApi("Subcontract orders");
  const res = await apiRequest<{ items: SubcontractOrderRow[] }>("/api/manufacturing/subcontract-orders", {
    params: listParams(params),
  });
  return res.items ?? [];
}

/** Create subcontract order (send stock to processor).
 * Requires a GRN line: `grnId` + `grnLineIndex`; input kg defaults to unallocated weight on that line, or pass `inputWeightKg` for partial sends.
 * Multiple active orders may reference the same line as long as total INPUT kg never exceeds the receipt line.
 * Use `bomId` with species/process for outputs/fees. Linked PO is resolved server-side from the GRN.
 */
export async function createSubcontractOrder(body: {
  workCenterId: string;
  bomId: string | null;
  reference?: string;
  species?: "TILAPIA" | "NILE_PERCH";
  processType?: "FILLETING" | "GUTTING";
  grnId: string;
  /** Zero-based GRN receipt line index */
  grnLineIndex: number;
  /** Partial send: kg to allocate from this line (omit to use remaining line balance). */
  inputWeightKg?: number;
}): Promise<SubcontractOrderRow> {
  requireLiveApi("Create subcontract order");
  const res = await apiRequest<SubcontractOrderRow>("/api/manufacturing/subcontract-orders", {
    method: "POST",
    body,
  });
  return res;
}

/** Fetch active reverse BOMs for the subcontract order creation picker.
 *  Only active BOMs are returned (activeOnly=true) so deactivated legacy BOMs
 *  are excluded from auto-selection without requiring a hard delete. */
export async function fetchReverseBoms(): Promise<Array<{ id: string; name: string; code: string; productId: string; direction: string; isActive: boolean; items: Array<{ productId: string; productName?: string; type: string; quantity: number }> }>> {
  requireLiveApi("Reverse BOMs");
  const res = await apiRequest<{ items: Array<Record<string, any>> }>("/api/manufacturing/boms", {
    params: { direction: "REVERSE", activeOnly: "true" },
  });
  return (res.items ?? []) as any[];
}

export async function fetchSubcontractOrderById(id: string): Promise<SubcontractOrderRow | null> {
  requireLiveApi("Subcontract order detail");
  try {
    return await apiRequest<SubcontractOrderRow>(`/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export type SubcontractCostingDrilldown = {
  orderId: string;
  number: string;
  status: string;
  inputQty: number;
  outputQty: number;
  expectedOutputQty: number;
  expectedYield: number;
  actualYield: number;
  yieldVariance: number;
  serviceFeeTotal: number;
  expectedFee: number;
  feeVariance: number;
  cogsImpact: {
    feePerActualOutputUnit: number;
    feePerExpectedOutputUnit: number;
  };
};

export async function fetchSubcontractCostingDrilldown(id: string): Promise<SubcontractCostingDrilldown | null> {
  requireLiveApi("Subcontract costing drilldown");
  try {
    return await apiRequest<SubcontractCostingDrilldown>(
      `/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}/costing-drilldown`
    );
  } catch {
    return null;
  }
}

export async function fetchWIPBalances(workCenterId?: string): Promise<WIPBalanceRow[]> {
  requireLiveApi("Subcontract WIP balances");
  const res = await apiRequest<{ items: WIPBalanceRow[] }>("/api/manufacturing/subcontract-orders/wip", {
    params: listParams({ workCenterId }),
  });
  return res.items ?? [];
}

export async function patchSubcontractOrder(
  id: string,
  patch: { outboundTripId?: string | null }
): Promise<{ id: string; outboundTripId?: string }> {
  requireLiveApi("Patch subcontract order");
  return apiRequest(`/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

export type SubcontractBatchCost = {
  orderId: string;
  number: string;
  status: string;
  rawMaterialCost: number | null;
  processingFee: number;
  transport: {
    tripId?: string;
    tripStatus: string | null;
    provisional: number;
    final: number | null;
    finalized: boolean;
    cost: number;
  };
  totalEstimate: number;
  currency: string;
};

export async function fetchSubcontractBatchCost(id: string): Promise<SubcontractBatchCost | null> {
  requireLiveApi("Subcontract batch cost");
  try {
    return await apiRequest<SubcontractBatchCost>(
      `/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}/batch-cost`
    );
  } catch {
    return null;
  }
}

export async function dispatchSubcontractOrder(id: string): Promise<SubcontractOrderRow> {
  requireLiveApi("Dispatch subcontract order");
  const res = await apiRequest<SubcontractOrderRow>(
    `/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}/dispatch`,
    { method: "POST", body: {} }
  );
  return res;
}

export async function receiveSubcontractOrder(
  id: string,
  body?: {
    warehouseId?: string;
    /** Per-line actual kg at receive; indices match order.lines */
    actualLineQuantities?: Array<{ lineIndex: number; quantity?: number; quantityKg?: number }>;
    /** Optional packing overrides per output line */
    packingOverrides?: Array<{
      lineIndex: number;
      packingMode: "STANDARD" | "CUSTOM";
      packagingType?: "BOX" | "SACK" | "MANUAL";
      packUnitCount?: number;
      packagingCostPerUnit?: number;
    }>;
  }
): Promise<SubcontractOrderRow> {
  requireLiveApi("Receive subcontract order");
  const payload: Record<string, unknown> = {};
  if (body?.warehouseId?.trim()) payload.warehouseId = body.warehouseId.trim();
  if (body?.actualLineQuantities?.length) payload.actualLineQuantities = body.actualLineQuantities;
  if (body?.packingOverrides?.length) payload.packingOverrides = body.packingOverrides;
  const res = await apiRequest<SubcontractOrderRow>(
    `/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}/receive`,
    { method: "POST", body: Object.keys(payload).length ? payload : {} }
  );
  return res;
}

// ─── Franchise Management ────────────────────────────────────────────────────

export interface NetworkOutletRow {
  id: string;
  name: string;
  territory: string | null;
  code: string | null;
  isActive: boolean;
  revenue30d: number;
  orderCount30d: number;
  customerCount: number;
  lastOrderDate: string | null;
  priceListId: string | null;
  priceListName: string | null;
}

export interface NetworkKpis {
  totalRevenue30d: number;
  activeOutlets: number;
  totalCustomers: number;
  pendingOrdersValue: number;
}

export async function fetchNetworkSummaryV2(): Promise<{ kpis: NetworkKpis; outlets: NetworkOutletRow[] }> {
  return apiRequest("/api/franchise/network/summary-v2");
}

export interface OutletSummary {
  outletOrgId: string;
  outletName?: string;
  /** HQ-assigned outlet catalog price list (`PATCH .../price-list`). */
  priceListId?: string | null;
  priceListName?: string | null;
  revenue30d: number;
  orderCount30d: number;
  customerCount: number;
  lastOrderDate: string | null;
  topProducts: Array<{ productId: string; name: string; sku?: string; totalQty: number; totalRevenue: number }>;
}

export async function fetchOutletSummary(outletOrgId: string): Promise<OutletSummary> {
  return apiRequest(`/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/summary`);
}

export interface FranchiseCustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  networkCustomerId: string | null;
  totalSpend: number;
  orderCount: number;
  lastPurchaseDate: string | null;
}

export async function fetchOutletCustomers(
  outletOrgId: string,
  params?: { search?: string; cursor?: string; limit?: number }
): Promise<{ items: FranchiseCustomerRow[]; nextCursor: string | null }> {
  const p = new URLSearchParams();
  if (params?.search) p.set("search", params.search);
  if (params?.cursor) p.set("cursor", params.cursor);
  if (params?.limit) p.set("limit", String(params.limit));
  const qs = p.toString();
  return apiRequest(`/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/customers${qs ? `?${qs}` : ""}`);
}

export interface CustomerHistoryItem {
  date: string;
  docId: string;
  docNumber: string;
  outletOrgId: string;
  outletName: string;
  productId: string;
  productName: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export async function fetchCustomerNetworkHistory(
  networkCustomerId: string,
  params?: { from?: string; to?: string; outletId?: string }
): Promise<{ items: CustomerHistoryItem[]; networkCustomerId: string }> {
  const p = new URLSearchParams();
  if (params?.from) p.set("from", params.from);
  if (params?.to) p.set("to", params.to);
  if (params?.outletId) p.set("outletId", params.outletId);
  const qs = p.toString();
  return apiRequest(`/api/franchise/customers/${encodeURIComponent(networkCustomerId)}/history${qs ? `?${qs}` : ""}`);
}

export async function assignOutletPriceList(outletOrgId: string, priceListId: string): Promise<{ outletOrgId: string; priceListId: string; priceListName: string }> {
  return apiRequest(`/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/price-list`, {
    method: "PATCH",
    body: { priceListId },
  });
}

export async function fetchMyCustomers(
  params?: { search?: string; cursor?: string; limit?: number }
): Promise<{ items: FranchiseCustomerRow[]; nextCursor: string | null }> {
  const p = new URLSearchParams();
  if (params?.search) p.set("search", params.search);
  if (params?.cursor) p.set("cursor", params.cursor);
  if (params?.limit) p.set("limit", String(params.limit));
  const qs = p.toString();
  return apiRequest(`/api/franchise/my-customers${qs ? `?${qs}` : ""}`);
}

export async function fetchMyCustomerHistory(partyId: string): Promise<{
  customerId: string;
  customerName: string;
  items: Array<{
    date: string;
    docId: string;
    docNumber: string;
    typeKey: string;
    productId: string;
    productName: string;
    sku?: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
}> {
  return apiRequest(`/api/franchise/my-customers/${encodeURIComponent(partyId)}/history`);
}

// ─── Franchise Ordering — Inbound Orders (HQ side) ───────────────────────────

export interface InboundOrderLine {
  productId?: string;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InboundOrderRow {
  id: string;
  number: string;
  date: string | null;
  status: string;
  outletOrgId: string;
  outletName: string;
  total: number;
  currency: string;
  /** Present when HQ spawned a sales order from this outlet PR. */
  linkedHqSalesOrder?: { id: string; number: string; status: string } | null;
  lines: InboundOrderLine[];
}

export async function fetchInboundOrders(params?: {
  status?: string;
  outletOrgId?: string;
  /** When true, include CONVERTED / CANCELLED PRs (e.g. outlet “Orders to HQ” history). */
  includeHistorical?: boolean;
}): Promise<{ items: InboundOrderRow[] }> {
  const p = new URLSearchParams();
  if (params?.status) p.set("status", params.status);
  if (params?.outletOrgId) p.set("outletOrgId", params.outletOrgId);
  if (params?.includeHistorical) p.set("includeHistorical", "1");
  const qs = p.toString();
  return apiRequest(`/api/franchise/network/inbound-orders${qs ? `?${qs}` : ""}`);
}

export type FranchiseInboundOrderDetail = Omit<InboundOrderRow, "lines"> & {
  notes: string | null;
  partyId: string | null;
  supplierName: string | null;
  lines: Array<InboundOrderLine & { unit?: string; description?: string }>;
};

export async function fetchFranchiseInboundOrderDetail(
  childOrgId: string,
  prId: string
): Promise<FranchiseInboundOrderDetail> {
  return apiRequest(
    `/api/franchise/network/inbound-orders/${encodeURIComponent(childOrgId)}/${encodeURIComponent(prId)}`
  );
}

export async function acceptInboundOrder(
  childOrgId: string,
  prId: string
): Promise<{ soId: string; soNumber: string; outletName: string }> {
  return apiRequest(`/api/franchise/network/inbound-orders/${encodeURIComponent(childOrgId)}/${encodeURIComponent(prId)}/accept`, {
    method: "POST",
    body: {},
  });
}

// ─── Franchise Stock (HQ reads outlet stock) ──────────────────────────────────

export interface OutletStockRow {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
  available: number;
}

export async function fetchOutletStock(outletOrgId: string): Promise<{ items: OutletStockRow[] }> {
  return apiRequest(`/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/stock`);
}

// ─── Outlet targets ──────────────────────────────────────────────────────────

export async function patchOutletTargets(
  outletOrgId: string,
  targets: { weeklySalesTargetValueKes?: number; weeklySalesTargetKg?: number }
): Promise<{ id: string; weeklySalesTargetValueKes?: number | null; weeklySalesTargetKg?: number | null }> {
  requireLiveApi("Patch outlet targets");
  return apiRequest(`/api/franchise/network/outlets/${encodeURIComponent(outletOrgId)}/targets`, {
    method: "PATCH",
    body: targets,
  });
}

// ─── Outlet weekly stock takes (HQ view) ─────────────────────────────────────

export interface OutletStockTakeRow {
  id: string;
  weekStart: string;
  status: "DRAFT" | "SUBMITTED";
  warehouseId: string;
  submittedAt?: string | null;
  lines: Array<{
    lineId: string;
    productId: string;
    sku?: string;
    productName?: string;
    systemQty: number;
    countedQty: number;
    variance: number;
  }>;
}

export async function fetchOutletStockTakes(outletOrgId: string): Promise<OutletStockTakeRow[]> {
  requireLiveApi("Outlet stock takes");
  const res = await apiRequest<{ items: OutletStockTakeRow[] }>(
    `/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/stock-takes`
  );
  return res?.items ?? [];
}

// ─── Franchise Network Sales Analytics ───────────────────────────────────────

export interface NetworkSalesSeries {
  period: string;
  outletOrgId: string;
  outletName: string;
  revenue: number;
  count: number;
}

export async function fetchNetworkSales(params?: {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
  outletOrgId?: string;
}): Promise<{ series: NetworkSalesSeries[]; totals: { revenue: number; count: number }; from: string; to: string; groupBy: string }> {
  const p = new URLSearchParams();
  if (params?.from) p.set("from", params.from);
  if (params?.to) p.set("to", params.to);
  if (params?.groupBy) p.set("groupBy", params.groupBy);
  if (params?.outletOrgId) p.set("outletOrgId", params.outletOrgId);
  const qs = p.toString();
  return apiRequest(`/api/franchise/network/sales${qs ? `?${qs}` : ""}`);
}

// ─── Extended OutletSummary with date-range invoices ─────────────────────────

export interface OutletInvoiceRow {
  id: string;
  number: string;
  date: string;
  total: number;
  customerName: string | null;
  status: string;
  /** True when any line sells above/below stored reference unit (if any). */
  hasRetailOverride?: boolean;
}

export interface OutletInvoiceLineDetailRow {
  lineId: string | null;
  lineNo: number;
  productId: string | null;
  sku: string | null;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  referenceUnitPrice: number | null;
  amount: number;
  delta: number;
}

export interface OutletInvoiceDetail {
  id: string;
  number: string;
  date: string | null;
  status: string;
  total: number;
  currency: string;
  outletOrgId: string;
  outletName: string;
  customerName: string | null;
  retailPaymentMethod: string | null;
  retailMpesaRef: string | null;
  lines: OutletInvoiceLineDetailRow[];
}

export async function fetchOutletInvoiceDetail(outletOrgId: string, invoiceId: string): Promise<OutletInvoiceDetail> {
  return apiRequest<OutletInvoiceDetail>(
    `/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/invoices/${encodeURIComponent(invoiceId)}`
  );
}

export async function fetchOutletSummaryRange(
  outletOrgId: string,
  params?: { from?: string; to?: string }
): Promise<OutletSummary & { from: string; to: string; invoices: OutletInvoiceRow[] }> {
  const p = new URLSearchParams();
  if (params?.from) p.set("from", params.from);
  if (params?.to) p.set("to", params.to);
  const qs = p.toString();
  return apiRequest(`/api/franchise/outlets/${encodeURIComponent(outletOrgId)}/summary${qs ? `?${qs}` : ""}`);
}
