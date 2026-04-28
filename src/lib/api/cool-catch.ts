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

export type CreateFranchiseOutletPayload = {
  name: string;
  outletCode: string;
  adminEmail: string;
  initialPassword: string;
  territory?: string;
  storeFormat?: string;
  managerName?: string;
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

// ——— Cash-to-weight audit ———

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
 *  Pass either `lines` (explicit) or `bomId + inputWeightKg` (auto-generate from BOM + rate card).
 *  If `grnId` is provided, the input weight is resolved from the GRN's processedWeightKg automatically.
 */
export async function createSubcontractOrder(body: {
  workCenterId: string;
  bomId?: string | null;
  reference?: string;
  species?: "TILAPIA" | "NILE_PERCH";
  processType?: "FILLETING" | "GUTTING";
  purchaseOrderId?: string | null;
  grnId?: string | null;
  /** Zero-based index of the specific GRN line being processed. Enables line-level reuse tracking. */
  grnLineIndex?: number;
  /** Override input weight (kg) — used when BOM-driven without a GRN link */
  inputWeightKg?: number;
  /** Explicit lines (optional — if omitted and bomId provided, lines are auto-generated) */
  lines?: {
    skuId: string;
    type: SubcontractOrderLineRow["type"];
    quantity: number;
    processingFeePerUnit?: number | null;
  }[];
}): Promise<SubcontractOrderRow> {
  requireLiveApi("Create subcontract order");
  const res = await apiRequest<SubcontractOrderRow>("/api/manufacturing/subcontract-orders", {
    method: "POST",
    body,
  });
  return res;
}

/** Fetch all reverse BOMs for the dropdown in subcontract order creation */
export async function fetchReverseBoms(): Promise<Array<{ id: string; name: string; code: string; productId: string; direction: string; items: Array<{ productId: string; productName?: string; type: string; quantity: number }> }>> {
  requireLiveApi("Reverse BOMs");
  const res = await apiRequest<{ items: Array<Record<string, any>> }>("/api/manufacturing/boms", {
    params: { direction: "REVERSE" },
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
    actualLineQuantities?: Array<{ lineIndex: number; quantity: number }>;
  }
): Promise<SubcontractOrderRow> {
  requireLiveApi("Receive subcontract order");
  const payload =
    body?.warehouseId || (body?.actualLineQuantities && body.actualLineQuantities.length)
      ? { warehouseId: body?.warehouseId, actualLineQuantities: body?.actualLineQuantities }
      : {};
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
  lines: InboundOrderLine[];
}

export async function fetchInboundOrders(params?: {
  status?: string;
  outletOrgId?: string;
}): Promise<{ items: InboundOrderRow[] }> {
  const p = new URLSearchParams();
  if (params?.status) p.set("status", params.status);
  if (params?.outletOrgId) p.set("outletOrgId", params.outletOrgId);
  const qs = p.toString();
  return apiRequest(`/api/franchise/network/inbound-orders${qs ? `?${qs}` : ""}`);
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
