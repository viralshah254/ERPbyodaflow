/**
 * Cool Catch / franchise API — uses backend when NEXT_PUBLIC_API_URL is set, else mocks.
 * See docs/COOL_CATCH_API_CONNECT.md for endpoint contract.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import {
  type CommissionRunLineRow,
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
  type SubcontractOrderLineRow,
  type SubcontractOrderRow,
  type WIPBalanceRow,
} from "@/lib/mock/manufacturing/subcontracting";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const STORAGE_KEYS = {
  commissionRuns: "odaflow_coolcatch_commission_runs",
  topUps: "odaflow_coolcatch_topups",
  replenishmentOrders: "odaflow_coolcatch_replenishment_orders",
  cashDisbursements: "odaflow_coolcatch_cash_disbursements",
  cashAudit: "odaflow_coolcatch_cash_audit",
  workCenters: "odaflow_coolcatch_work_centers",
  subcontractOrders: "odaflow_coolcatch_subcontract_orders",
} as const;

function listParams(p?: Record<string, string | undefined>): Record<string, string> {
  if (!p) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v != null && v !== "") out[k] = v;
  return out;
}

function loadCommissionRuns(): CommissionRunRow[] {
  return loadStoredValue(STORAGE_KEYS.commissionRuns, () => getMockCommissionRuns());
}

function saveCommissionRuns(rows: CommissionRunRow[]): void {
  saveStoredValue(STORAGE_KEYS.commissionRuns, rows);
}

function loadTopUps(): TopUpRow[] {
  return loadStoredValue(STORAGE_KEYS.topUps, () => getMockTopUps());
}

function saveTopUps(rows: TopUpRow[]): void {
  saveStoredValue(STORAGE_KEYS.topUps, rows);
}

function loadReplenishmentOrders(): VMIReplenishmentOrderRow[] {
  return loadStoredValue(STORAGE_KEYS.replenishmentOrders, () => getMockVMIReplenishmentOrders());
}

function saveReplenishmentOrders(rows: VMIReplenishmentOrderRow[]): void {
  saveStoredValue(STORAGE_KEYS.replenishmentOrders, rows);
}

function loadCashDisbursements(): CashDisbursementRow[] {
  return loadStoredValue(STORAGE_KEYS.cashDisbursements, () => getMockCashDisbursements());
}

function saveCashDisbursements(rows: CashDisbursementRow[]): void {
  saveStoredValue(STORAGE_KEYS.cashDisbursements, rows);
}

function loadCashAuditLines(): CashWeightAuditLineRow[] {
  return loadStoredValue(STORAGE_KEYS.cashAudit, () => getMockCashWeightAuditLines());
}

function saveCashAuditLines(rows: CashWeightAuditLineRow[]): void {
  saveStoredValue(STORAGE_KEYS.cashAudit, rows);
}

function loadWorkCenters(): ExternalWorkCenterRow[] {
  return loadStoredValue(STORAGE_KEYS.workCenters, () => getMockExternalWorkCenters());
}

function saveWorkCenters(rows: ExternalWorkCenterRow[]): void {
  saveStoredValue(STORAGE_KEYS.workCenters, rows);
}

function loadSubcontractOrders(): SubcontractOrderRow[] {
  return loadStoredValue(STORAGE_KEYS.subcontractOrders, () => getMockSubcontractOrders());
}

function saveSubcontractOrders(rows: SubcontractOrderRow[]): void {
  saveStoredValue(STORAGE_KEYS.subcontractOrders, rows);
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

// ——— Commission ———

export async function fetchCommissionRuns(params?: { status?: string }): Promise<CommissionRunRow[]> {
  if (!isApiConfigured()) {
    let runs = loadCommissionRuns().map((r) => ({ ...r, lines: r.lines ? [...r.lines] : undefined }));
    if (params?.status) runs = runs.filter((r) => r.status === params.status);
    return runs;
  }
  const res = await apiRequest<{ items: CommissionRunRow[] }>("/api/franchise/commission/runs", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchCommissionRunById(id: string): Promise<CommissionRunRow | null> {
  if (!isApiConfigured()) return loadCommissionRuns().find((r) => r.id === id) ?? null;
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
  if (!isApiConfigured()) {
    let rows = [...loadTopUps()];
    if (params?.franchiseeId) rows = rows.filter((r) => r.franchiseeId === params.franchiseeId);
    if (params?.runId) rows = rows.filter((r) => r.runId === params.runId);
    return rows;
  }
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
  if (!isApiConfigured()) {
    let runs = loadCommissionRuns();
    let topUps = loadTopUps();
    if (params?.status && params.status !== "ALL") runs = runs.filter((r) => r.status === params.status);
    if (params?.franchiseeId) {
      runs = runs
        .map((r) => ({
          ...r,
          lines: (r.lines ?? []).filter((l) => l.franchiseeId === params.franchiseeId),
        }))
        .filter((r) => (r.lines?.length ?? 0) > 0);
      topUps = topUps.filter((t) => t.franchiseeId === params.franchiseeId);
    }
    const byFranchisee = new Map<string, CommissionSummaryRow>();
    for (const run of runs) {
      for (const line of run.lines ?? []) {
        const row = byFranchisee.get(line.franchiseeId) ?? {
          franchiseeId: line.franchiseeId,
          franchiseeCode: line.franchiseeId.toUpperCase(),
          franchiseeName: line.franchiseeName,
          runs: 0,
          salesAmount: 0,
          commissionAmount: 0,
          topUpAmount: 0,
          totalPayout: 0,
        };
        row.runs += 1;
        row.salesAmount += line.salesAmount;
        row.commissionAmount += line.commissionAmount;
        byFranchisee.set(line.franchiseeId, row);
      }
    }
    for (const topUp of topUps) {
      const row = byFranchisee.get(topUp.franchiseeId) ?? {
        franchiseeId: topUp.franchiseeId,
        franchiseeCode: topUp.franchiseeId.toUpperCase(),
        franchiseeName: topUp.franchiseeName,
        runs: 0,
        salesAmount: 0,
        commissionAmount: 0,
        topUpAmount: 0,
        totalPayout: 0,
      };
      row.topUpAmount += topUp.amount;
      byFranchisee.set(topUp.franchiseeId, row);
    }
    const items = Array.from(byFranchisee.values()).map((row) => ({
      ...row,
      totalPayout: row.commissionAmount + row.topUpAmount,
    }));
    return {
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      status: params?.status,
      items,
      totalCommission: items.reduce((a, r) => a + r.commissionAmount, 0),
      totalTopUp: items.reduce((a, r) => a + r.topUpAmount, 0),
      totalPayout: items.reduce((a, r) => a + r.totalPayout, 0),
    };
  }
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
  if (!isApiConfigured()) {
    const runs = loadCommissionRuns().map((r) => (r.id === id ? { ...r, status: "POSTED" as const } : r));
    saveCommissionRuns(runs);
    return;
  }
  await apiRequest(`/api/franchise/commission/runs/${encodeURIComponent(id)}/post`, { method: "POST" });
}

/** Auto-calculate commission run from posted invoices for the period. Body: { periodStart, periodEnd }. */
export async function calculateCommissionRun(body: { periodStart: string; periodEnd: string }): Promise<CommissionRunRow> {
  if (!isApiConfigured()) {
    const stock = getMockFranchiseeStock();
    const grouped = new Map<string, { franchiseeName: string; salesAmount: number }>();
    for (const row of stock) {
      const current = grouped.get(row.franchiseeId) ?? { franchiseeName: row.franchiseeName, salesAmount: 0 };
      current.salesAmount += row.qty * 1000;
      grouped.set(row.franchiseeId, current);
    }
    const lines: CommissionRunLineRow[] = Array.from(grouped.entries()).map(([franchiseeId, v], idx) => {
      const commissionAmount = Math.round(v.salesAmount * 0.12);
      const minFloor = 25000;
      const topUpAmount = Math.max(0, minFloor - commissionAmount);
      return {
        id: `crl-${Date.now()}-${idx}`,
        runId: `run-${Date.now()}`,
        franchiseeId,
        franchiseeName: v.franchiseeName,
        salesAmount: v.salesAmount,
        commissionAmount,
        minFloor,
        topUpAmount,
        status: topUpAmount > 0 ? "TOPUP" : "OK",
      };
    });
    const runId = `run-${Date.now()}`;
    const run: CommissionRunRow = {
      id: runId,
      number: `COMM-${body.periodStart.replaceAll("-", "")}-${body.periodEnd.replaceAll("-", "")}`,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      status: "DRAFT",
      totalPayout: lines.reduce((a, l) => a + l.commissionAmount + l.topUpAmount, 0),
      lineCount: lines.length,
      createdAt: new Date().toISOString(),
      lines: lines.map((l) => ({ ...l, runId })),
    };
    saveCommissionRuns([run, ...loadCommissionRuns()]);
    const topups = [
      ...loadTopUps(),
      ...lines
        .filter((l) => l.topUpAmount > 0)
        .map((l, idx) => ({
          id: `tu-${Date.now()}-${idx}`,
          franchiseeId: l.franchiseeId,
          franchiseeName: l.franchiseeName,
          runId,
          runNumber: run.number,
          amount: l.topUpAmount,
          reason: "Guaranteed minimum margin shortfall",
          status: "PENDING" as const,
          createdAt: new Date().toISOString(),
        })),
    ];
    saveTopUps(topups);
    return run;
  }
  const res = await apiRequest<CommissionRunRow>("/api/franchise/commission/runs/calculate", { method: "POST", body });
  return res;
}

/** Manual create commission run. Body: { periodStart, periodEnd, lines? }. */
export async function createCommissionRun(body: {
  periodStart: string;
  periodEnd: string;
  lines?: { franchiseeId: string; salesAmount?: number; commissionAmount?: number }[];
}): Promise<CommissionRunRow> {
  if (!isApiConfigured()) {
    const run: CommissionRunRow = {
      id: `run-${Date.now()}`,
      number: `COMM-DRAFT-${Date.now()}`,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      status: "DRAFT",
      totalPayout: 0,
      lineCount: body.lines?.length ?? 0,
      createdAt: new Date().toISOString(),
      lines:
        body.lines?.map((line, idx) => ({
          id: `crl-${Date.now()}-${idx}`,
          runId: `run-${Date.now()}`,
          franchiseeId: line.franchiseeId,
          franchiseeName: line.franchiseeId,
          salesAmount: line.salesAmount ?? 0,
          commissionAmount: line.commissionAmount ?? 0,
          minFloor: null,
          topUpAmount: 0,
          status: "OK",
        })) ?? [],
    };
    saveCommissionRuns([run, ...loadCommissionRuns()]);
    return run;
  }
  const res = await apiRequest<CommissionRunRow>("/api/franchise/commission/runs", { method: "POST", body });
  return res;
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
  if (!isApiConfigured()) {
    let rows = loadReplenishmentOrders();
    if (params?.franchiseeId) rows = rows.filter((r) => r.franchiseeId === params.franchiseeId);
    if (params?.status) rows = rows.filter((r) => r.status === params.status);
    return rows;
  }
  const res = await apiRequest<{ items: VMIReplenishmentOrderRow[] }>("/api/franchise/vmi/replenishment-orders", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchVMIReplenishmentOrderById(id: string): Promise<VMIReplenishmentOrderRow | null> {
  if (!isApiConfigured()) {
    return loadReplenishmentOrders().find((o) => o.id === id) ?? null;
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
  if (!isApiConfigured()) {
    const rows = loadReplenishmentOrders().map((r) =>
      r.id === id && r.status === "DRAFT" ? { ...r, status: "SENT" as const } : r
    );
    saveReplenishmentOrders(rows);
    return;
  }
  await apiRequest(`/api/franchise/vmi/replenishment-orders/${encodeURIComponent(id)}/confirm`, { method: "POST" });
}

/** Auto-create replenishment orders from suggestions (reorder points). Body: { sourceWarehouseId?, franchiseeId? }. */
export async function autoReplenish(body?: { sourceWarehouseId?: string; franchiseeId?: string }): Promise<{ created: number; orderIds?: string[] }> {
  if (!isApiConfigured()) {
    const suggestions = getMockVMISuggestions().filter((s) => !body?.franchiseeId || s.franchiseeId === body.franchiseeId);
    const byFranchisee = new Map<string, FranchiseeStockRow[]>();
    for (const s of suggestions) {
      byFranchisee.set(s.franchiseeId, [...(byFranchisee.get(s.franchiseeId) ?? []), s]);
    }
    const existing = loadReplenishmentOrders();
    const created: VMIReplenishmentOrderRow[] = Array.from(byFranchisee.entries()).map(([franchiseeId, lines], idx) => ({
      id: `ro-${Date.now()}-${idx}`,
      number: `RO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${idx + 1}`,
      franchiseeId,
      franchiseeName: lines[0]?.franchiseeName ?? franchiseeId,
      sourceWarehouse: body?.sourceWarehouseId ?? "Nairobi Cold Hub",
      status: "DRAFT",
      lineCount: lines.length,
      totalQty: lines.reduce((a, l) => a + l.suggestedOrder, 0),
      createdAt: new Date().toISOString(),
      lines: lines.map((l) => ({ sku: l.sku, productName: l.productName, qty: l.suggestedOrder })),
    }));
    saveReplenishmentOrders([...created, ...existing]);
    return { created: created.length, orderIds: created.map((c) => c.id) };
  }
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
  if (!isApiConfigured()) {
    let rows = loadCashAuditLines();
    if (params?.status) rows = rows.filter((r) => r.status === params.status);
    return rows;
  }
  const res = await apiRequest<{ items: CashWeightAuditLineRow[] }>("/api/purchasing/cash-weight-audit", {
    params: listParams(params),
  });
  return res.items ?? [];
}

export async function fetchCashDisbursements(poId?: string): Promise<CashDisbursementRow[]> {
  if (!isApiConfigured()) {
    let rows = loadCashDisbursements();
    if (poId) rows = rows.filter((r) => r.poId === poId);
    return rows;
  }
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
  paidWeightKg?: number;
}): Promise<{ id: string }> {
  if (!isApiConfigured()) {
    const auditLines = loadCashAuditLines();
    const poNumber = auditLines.find((l) => l.poId === body.poId)?.poNumber ?? body.poId.toUpperCase();
    const row: CashDisbursementRow = {
      id: `cd-${Date.now()}`,
      poId: body.poId,
      poNumber,
      amount: body.amount,
      currency: body.currency,
      paidAt: body.paidAt,
      reference: body.reference ?? `Disbursement ${poNumber}`,
      status: "PENDING",
    };
    saveCashDisbursements([row, ...loadCashDisbursements()]);
    if (typeof body.paidWeightKg === "number") {
      const paidWeightKg = body.paidWeightKg;
      const updatedAudit = auditLines.map((line) =>
        line.poId === body.poId
          ? {
              ...line,
              paidWeightKg,
              disbursementId: row.id,
              varianceKg:
                line.receivedWeightKg != null ? line.receivedWeightKg - paidWeightKg : line.varianceKg,
            }
          : line
      );
      saveCashAuditLines(updatedAudit);
    }
    return { id: row.id };
  }
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
  if (!isApiConfigured()) {
    const rows = loadCashAuditLines().map((line) => {
      if (line.id !== body.auditLineId) return line;
      const paidWeightKg = body.paidWeightKg ?? line.paidWeightKg;
      const receivedWeightKg = body.receivedWeightKg ?? line.receivedWeightKg;
      const varianceKg =
        paidWeightKg != null && receivedWeightKg != null ? receivedWeightKg - paidWeightKg : null;
      return {
        ...line,
        paidWeightKg,
        receivedWeightKg,
        varianceKg,
        status: varianceKg === 0 ? "MATCHED" as const : "VARIANCE" as const,
      };
    });
    saveCashAuditLines(rows);
    const disbursements = loadCashDisbursements().map((d) =>
      d.id === body.disbursementId ? { ...d, status: "RECONCILED" as const } : d
    );
    saveCashDisbursements(disbursements);
    return;
  }
  await apiRequest("/api/purchasing/cash-weight-audit/reconcile", { method: "POST", body });
}

/** Build audit lines from PO + Cash disbursements + GRN. Body: { poId?, dateFrom?, dateTo? }. */
export async function buildCashWeightAudit(body?: { poId?: string; dateFrom?: string; dateTo?: string }): Promise<{ built: number }> {
  if (!isApiConfigured()) {
    const rows = loadCashAuditLines();
    return { built: body?.poId ? rows.filter((r) => r.poId === body.poId).length : rows.length };
  }
  const res = await apiRequest<{ built: number }>("/api/purchasing/cash-weight-audit/build", { method: "POST", body: body ?? {} });
  return res;
}

// ——— Subcontracting ———

export async function fetchExternalWorkCenters(): Promise<ExternalWorkCenterRow[]> {
  if (!isApiConfigured()) return loadWorkCenters();
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
  if (!isApiConfigured()) {
    const row: ExternalWorkCenterRow = {
      id: `wc-${Date.now()}`,
      code: body.code,
      name: body.name,
      type: body.type,
      address: body.address,
      isActive: body.isActive ?? true,
    };
    saveWorkCenters([row, ...loadWorkCenters()]);
    return row;
  }
  const res = await apiRequest<ExternalWorkCenterRow>("/api/manufacturing/work-centers/external", {
    method: "POST",
    body,
  });
  return res;
}

export async function fetchSubcontractOrders(params?: {
  workCenterId?: string;
  status?: string;
}): Promise<SubcontractOrderRow[]> {
  if (!isApiConfigured()) {
    let rows = loadSubcontractOrders();
    if (params?.workCenterId) rows = rows.filter((r) => r.workCenterId === params.workCenterId);
    if (params?.status) rows = rows.filter((r) => r.status === params.status);
    return rows;
  }
  const res = await apiRequest<{ items: SubcontractOrderRow[] }>("/api/manufacturing/subcontract-orders", {
    params: listParams(params),
  });
  return res.items ?? [];
}

/** Create subcontract order (send stock to processor). */
export async function createSubcontractOrder(body: {
  workCenterId: string;
  bomId?: string | null;
  reference?: string;
  /** Expected receive date. */
  expectedAt?: string;
  /** Input and output lines, including processing fees. */
  lines: {
    sku: string;
    productName?: string;
    type: SubcontractOrderLineRow["type"];
    quantity: number;
    uom: string;
    processingFeePerUnit?: number | null;
  }[];
}): Promise<SubcontractOrderRow> {
  if (!isApiConfigured()) {
    const workCenter = loadWorkCenters().find((w) => w.id === body.workCenterId);
    const orderId = `so-${Date.now()}`;
    const lines: SubcontractOrderLineRow[] = body.lines.map((line, idx) => ({
      id: `sol-${Date.now()}-${idx}`,
      orderId,
      sku: line.sku,
      productName: line.productName ?? line.sku,
      type: line.type,
      quantity: line.quantity,
      uom: line.uom,
      processingFeePerUnit: line.processingFeePerUnit ?? null,
      amount:
        typeof line.processingFeePerUnit === "number" ? line.processingFeePerUnit * line.quantity : null,
    }));
    const order: SubcontractOrderRow = {
      id: orderId,
      number: body.reference ?? `SCO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(Math.random() * 1000)}`,
      workCenterId: body.workCenterId,
      workCenterName: workCenter?.name ?? body.workCenterId,
      bomId: body.bomId ?? null,
      bomName: null,
      status: "WIP",
      sentAt: new Date().toISOString().slice(0, 10),
      receivedAt: null,
      createdAt: new Date().toISOString(),
      lines,
    };
    saveSubcontractOrders([order, ...loadSubcontractOrders()]);
    return order;
  }
  const res = await apiRequest<SubcontractOrderRow>("/api/manufacturing/subcontract-orders", {
    method: "POST",
    body,
  });
  return res;
}

export async function fetchSubcontractOrderById(id: string): Promise<SubcontractOrderRow | null> {
  if (!isApiConfigured()) return loadSubcontractOrders().find((o) => o.id === id) ?? null;
  try {
    return await apiRequest<SubcontractOrderRow>(`/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function fetchWIPBalances(workCenterId?: string): Promise<WIPBalanceRow[]> {
  if (!isApiConfigured()) {
    const rows: WIPBalanceRow[] = [];
    for (const order of loadSubcontractOrders()) {
      if (order.status !== "WIP") continue;
      for (const line of order.lines ?? []) {
        if (line.type !== "INPUT") continue;
        rows.push({
          workCenterId: order.workCenterId,
          workCenterName: order.workCenterName,
          sku: line.sku,
          productName: line.productName,
          quantity: line.quantity,
          uom: line.uom,
          lastMovementAt: order.sentAt ?? order.createdAt,
        });
      }
    }
    return workCenterId ? rows.filter((r) => r.workCenterId === workCenterId) : rows;
  }
  const res = await apiRequest<{ items: WIPBalanceRow[] }>("/api/manufacturing/subcontract-orders/wip", {
    params: listParams({ workCenterId }),
  });
  return res.items ?? [];
}

export async function receiveSubcontractOrder(id: string): Promise<void> {
  if (!isApiConfigured()) {
    const rows = loadSubcontractOrders().map((o) =>
      o.id === id ? { ...o, status: "RECEIVED" as const, receivedAt: new Date().toISOString().slice(0, 10) } : o
    );
    saveSubcontractOrders(rows);
    return;
  }
  await apiRequest(`/api/manufacturing/subcontract-orders/${encodeURIComponent(id)}/receive`, { method: "POST" });
}
