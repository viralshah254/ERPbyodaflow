/**
 * Backend-only endpoint helpers for actions that must execute on the server.
 */

import { apiRequest, downloadFile, requireLiveApi } from "./client";

const API = "/api";

function requireLiveApiForCritical(action: string): void {
  requireLiveApi(action);
}

// —— Documents ——
export async function documentRequestApproval(
  docType: string,
  id: string,
  comment?: string
): Promise<void> {
  requireLiveApiForCritical("Document approval request");
  await apiRequest(`${API}/documents/${docType}/${id}/request-approval`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

export async function documentAction(
  docType: string,
  id: string,
  action: "approve" | "post" | "cancel" | "reverse",
  comment?: string
): Promise<void> {
  requireLiveApiForCritical(`Document action '${action}'`);
  await apiRequest(`${API}/documents/${docType}/${id}/action`, {
    method: "POST",
    body: { action, ...(comment != null ? { comment } : {}) },
  });
}

export function documentDownloadPdf(
  docType: string,
  id: string,
  filename: string,
  onNotAvailable: (msg: string) => void
): void {
  requireLiveApiForCritical("Document PDF export");
  downloadFile(
    `${API}/documents/${docType}/${id}/pdf`,
    filename || `${docType}-${id}.pdf`,
    onNotAvailable
  );
}

// —— Inventory ——
export async function runCosting(): Promise<void> {
  requireLiveApiForCritical("Inventory costing run");
  await apiRequest(`${API}/inventory/costing/run`, { method: "POST", body: {} });
}

// —— Warehouse ——
export async function warehouseTransferReceive(id: string, body?: { lines?: unknown }): Promise<void> {
  requireLiveApiForCritical("Warehouse transfer receipt");
  await apiRequest(`${API}/warehouse/transfers/${id}/receive`, { method: "POST", body: body ?? {} });
}

export async function warehousePickPackComplete(id: string): Promise<void> {
  requireLiveApiForCritical("Pick-pack completion");
  await apiRequest(`${API}/warehouse/pick-pack/${id}/complete`, { method: "POST", body: {} });
}

export async function warehousePutawayConfirm(id: string): Promise<void> {
  requireLiveApiForCritical("Putaway confirmation");
  await apiRequest(`${API}/warehouse/putaway/${id}/confirm`, { method: "POST", body: {} });
}

export async function warehouseCycleCountSubmit(id: string): Promise<void> {
  requireLiveApiForCritical("Cycle count submission");
  await apiRequest(`${API}/warehouse/cycle-counts/${id}/submit`, { method: "POST", body: {} });
}

// —— Finance ——
export async function periodClose(payload: { periodId?: string; date?: string }): Promise<void> {
  requireLiveApiForCritical("Period close");
  await apiRequest(`${API}/finance/period/close`, { method: "POST", body: payload });
}

export async function periodReopen(periodId: string): Promise<void> {
  requireLiveApiForCritical("Period reopen");
  await apiRequest(`${API}/finance/period/reopen`, { method: "POST", body: { periodId } });
}

// —— Treasury ——
export async function paymentRunApprove(id: string): Promise<void> {
  requireLiveApiForCritical("Payment run approval");
  await apiRequest(`${API}/treasury/payment-runs/${id}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

// —— Payroll ——
export async function payRunApprove(id: string): Promise<void> {
  requireLiveApiForCritical("Pay run approval");
  await apiRequest(`${API}/payroll/pay-runs/${id}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

// —— Approvals ——
export async function approvalApprove(id: string, comment?: string): Promise<void> {
  requireLiveApiForCritical("Approval approve");
  await apiRequest(`${API}/approvals/${id}/approve`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

export async function approvalReject(id: string, comment?: string): Promise<void> {
  requireLiveApiForCritical("Approval reject");
  await apiRequest(`${API}/approvals/${id}/reject`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

// —— Settings ——
export async function orgSave(payload: Record<string, unknown>): Promise<void> {
  requireLiveApiForCritical("Organization settings save");
  await apiRequest(`${API}/org`, { method: "PATCH", body: payload });
}

// —— Products (masters) ——
export async function productDelete(id: string): Promise<void> {
  requireLiveApiForCritical("Product delete");
  await apiRequest(`${API}/products/${id}`, { method: "DELETE" });
}

export async function productApplyPricingTemplate(productId: string, templateId: string): Promise<void> {
  requireLiveApiForCritical("Product pricing template apply");
  await apiRequest(`${API}/products/${productId}/pricing/apply-template`, {
    method: "POST",
    body: { templateId },
  });
}

// —— Assets ——
export async function runDepreciation(payload?: { period?: string }): Promise<void> {
  requireLiveApiForCritical("Depreciation run");
  await apiRequest(`${API}/assets/depreciation/run`, { method: "POST", body: payload ?? {} });
}

// —— Purchasing (returns) ——
export async function purchaseReturnCreate(body?: { lines?: unknown[] }): Promise<{ id: string }> {
  requireLiveApiForCritical("Purchase return creation");
  return apiRequest<{ id: string }>(`${API}/purchasing/returns`, {
    method: "POST",
    body: body ?? {},
  });
}

export async function purchaseReturnApprove(returnId: string): Promise<void> {
  requireLiveApiForCritical("Purchase return approval");
  await apiRequest(`${API}/purchasing/returns/${returnId}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

export function purchaseReturnsExport(onNotAvailable: (msg: string) => void): void {
  requireLiveApiForCritical("Purchase returns export");
  downloadFile(
    `${API}/purchasing/returns/export`,
    `purchase-returns-${new Date().toISOString().slice(0, 10)}.csv`,
    onNotAvailable
  );
}

// —— AP three-way match ——
export async function threeWayMatch(grnLineIds: string[], billLineIds: string[]): Promise<void> {
  requireLiveApiForCritical("AP three-way match");
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
  requireLiveApiForCritical("AR allocation");
  await apiRequest(`${API}/ar/payments/${paymentId}/allocate`, {
    method: "POST",
    body,
  });
}

// —— Analytics / Automation ——
export async function analyticsApplySuggestion(suggestionId: string, override?: unknown): Promise<void> {
  requireLiveApiForCritical("Analytics suggestion apply");
  await apiRequest(`${API}/analytics/simulations/apply`, {
    method: "POST",
    body: { suggestionId, ...(override != null && { override }) },
  });
}

export async function automationInsightApply(insightId: string, actionId: string): Promise<void> {
  requireLiveApiForCritical("Automation insight apply");
  await apiRequest(`${API}/automation/insights/${insightId}/apply`, {
    method: "POST",
    body: { actionId },
  });
}

export function exportPaymentRunFile(id: string, onNotAvailable: (msg: string) => void): void {
  requireLiveApiForCritical("Payment run export");
  void downloadFile(
    `${API}/treasury/payment-runs/${encodeURIComponent(id)}/export`,
    `payment-run-${id}.csv`,
    onNotAvailable
  );
}
