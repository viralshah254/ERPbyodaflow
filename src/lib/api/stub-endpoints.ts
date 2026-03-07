/**
 * Stub endpoint helpers — call backend when API is configured, otherwise no-op for UI to show stub toast.
 * Matches BACKEND_API_SPEC_SINGLE_SOURCE.md. Use with: try { await X(); toast.success(...); } catch { toast.info("... (stub). API pending."); }
 */

import { apiRequest, downloadFile, isApiConfigured } from "./client";

const API = "/api";

// —— Documents ——
export async function documentRequestApproval(
  docType: string,
  id: string,
  comment?: string
): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/documents/${docType}/${id}/request-approval`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

export async function documentAction(
  docType: string,
  id: string,
  action: "approve" | "post",
  comment?: string
): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/documents/${docType}/${id}/action`, {
    method: "POST",
    body: action === "approve" ? { action: "approve", comment } : { action: "post" },
  });
}

export function documentDownloadPdf(
  docType: string,
  id: string,
  filename: string,
  onNotAvailable: (msg: string) => void
): void {
  if (!isApiConfigured()) {
    onNotAvailable("Export PDF (stub). Set NEXT_PUBLIC_API_URL to use backend.");
    return;
  }
  downloadFile(
    `${API}/documents/${docType}/${id}/pdf`,
    filename || `${docType}-${id}.pdf`,
    onNotAvailable
  );
}

// —— Inventory ——
export async function runCosting(): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/inventory/costing/run`, { method: "POST", body: {} });
}

// —— Warehouse ——
export async function warehouseTransferReceive(id: string, body?: { lines?: unknown }): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/warehouse/transfers/${id}/receive`, { method: "POST", body: body ?? {} });
}

export async function warehousePickPackComplete(id: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/warehouse/pick-pack/${id}/complete`, { method: "POST", body: {} });
}

export async function warehousePutawayConfirm(id: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/warehouse/putaway/${id}/confirm`, { method: "POST", body: {} });
}

export async function warehouseCycleCountSubmit(id: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/warehouse/cycle-counts/${id}/submit`, { method: "POST", body: {} });
}

// —— Finance ——
export async function periodClose(payload: { periodId?: string; date?: string }): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/finance/period/close`, { method: "POST", body: payload });
}

export async function periodReopen(periodId: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/finance/period/reopen`, { method: "POST", body: { periodId } });
}

// —— Treasury ——
export async function paymentRunApprove(id: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/treasury/payment-runs/${id}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

// —— Payroll ——
export async function payRunApprove(id: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/payroll/pay-runs/${id}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

// —— Approvals ——
export async function approvalApprove(id: string, comment?: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/approvals/${id}/approve`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

export async function approvalReject(id: string, comment?: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/approvals/${id}/reject`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

// —— Settings ——
export async function orgSave(payload: Record<string, unknown>): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/org`, { method: "PATCH", body: payload });
}

// —— Products (masters) ——
export async function productDelete(id: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/products/${id}`, { method: "DELETE" });
}

export async function productApplyPricingTemplate(productId: string, templateId: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/products/${productId}/pricing/apply-template`, {
    method: "POST",
    body: { templateId },
  });
}

// —— Assets ——
export async function runDepreciation(payload?: { period?: string }): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/assets/depreciation/run`, { method: "POST", body: payload ?? {} });
}

// —— Purchasing (returns) ——
export async function purchaseReturnCreate(body?: { lines?: unknown[] }): Promise<{ id: string }> {
  if (!isApiConfigured()) throw new Error("STUB");
  return apiRequest<{ id: string }>(`${API}/purchasing/returns`, {
    method: "POST",
    body: body ?? {},
  });
}

export async function purchaseReturnApprove(returnId: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/purchasing/returns/${returnId}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

export function purchaseReturnsExport(onNotAvailable: (msg: string) => void): void {
  if (!isApiConfigured()) {
    onNotAvailable("Export (stub). Set NEXT_PUBLIC_API_URL to use backend.");
    return;
  }
  downloadFile(
    `${API}/purchasing/returns/export`,
    `purchase-returns-${new Date().toISOString().slice(0, 10)}.csv`,
    onNotAvailable
  );
}

// —— AP three-way match ——
export async function threeWayMatch(grnLineIds: string[], billLineIds: string[]): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/ap/three-way-match/match`, {
    method: "POST",
    body: { grnLineIds, billLineIds },
  });
}

// —— AR allocate ——
export async function arAllocate(
  paymentId: string,
  body: { invoiceIds: string[]; amounts: number[] }
): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/ar/payments/${paymentId}/allocate`, {
    method: "POST",
    body,
  });
}

// —— Analytics / Automation (stub only; backend may add later) ——
export async function analyticsApplySuggestion(suggestionId: string, override?: unknown): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/analytics/simulations/apply`, {
    method: "POST",
    body: { suggestionId, ...(override != null && { override }) },
  });
}

export async function automationInsightApply(insightId: string, actionId: string): Promise<void> {
  if (!isApiConfigured()) throw new Error("STUB");
  await apiRequest(`${API}/automation/insights/${insightId}/apply`, {
    method: "POST",
    body: { actionId },
  });
}
