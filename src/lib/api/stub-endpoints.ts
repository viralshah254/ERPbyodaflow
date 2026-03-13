/**
 * Demo-safe endpoint helpers — call backend when API is configured, otherwise
 * fall back to lightweight client-side behaviors so primary actions still work.
 */

import { apiRequest, downloadFile, downloadTextFile, isApiConfigured } from "./client";
import { updateFiscalPeriodStatus } from "@/lib/data/fiscal.repo";
import { listPaymentRuns, updatePaymentRunStatus } from "@/lib/data/payment-runs.repo";
import { updateApprovalStatus } from "@/lib/data/approvals.repo";
import { updateTransferStatus } from "@/lib/api/warehouse-transfers";
import {
  applyDocumentAction,
  requestDocumentApproval,
} from "@/lib/data/documents.repo";
import type { DocTypeKey } from "@/config/documents/types";
import { saveOrgProfile } from "@/lib/data/org-profile.repo";
import { completePickPackOrder, confirmPutaway } from "@/lib/data/warehouse-execution.repo";
import { approvePayRun } from "@/lib/data/payroll.repo";
import { createPurchaseReturn, updatePurchaseReturnStatus } from "@/lib/data/purchasing.repo";
import { createThreeWayMatch } from "@/lib/data/ap-match.repo";
import { recordCostingRun } from "@/lib/data/inventory-costing.repo";
import { submitCycleCount } from "@/lib/data/cycle-counts.repo";
import { allocateArPayment } from "@/lib/data/ar.repo";
import { recordDepreciationRun } from "@/lib/data/depreciation.repo";
import { saveStoredValue } from "@/lib/data/persisted-store";
import { getMockDepreciationPreview } from "@/lib/mock/assets/depreciation";
import { deleteProduct as deleteProductRecord } from "@/lib/data/products.repo";

const API = "/api";

// —— Documents ——
export async function documentRequestApproval(
  docType: string,
  id: string,
  comment?: string
): Promise<void> {
  if (!isApiConfigured()) {
    requestDocumentApproval(docType as DocTypeKey, id);
    return;
  }
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
  if (!isApiConfigured()) {
    if (action === "approve" || action === "post") {
      applyDocumentAction(docType as DocTypeKey, id, action);
      return;
    }
    return;
  }
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
  if (!isApiConfigured()) {
    downloadTextFile(
      filename.replace(/\.pdf$/i, ".txt"),
      `Document export preview\nType: ${docType}\nID: ${id}\nGenerated: ${new Date().toISOString()}`
    );
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
  if (!isApiConfigured()) {
    recordCostingRun(new Date().toISOString().slice(0, 7));
    return;
  }
  await apiRequest(`${API}/inventory/costing/run`, { method: "POST", body: {} });
}

// —— Warehouse ——
export async function warehouseTransferReceive(id: string, body?: { lines?: unknown }): Promise<void> {
  if (!isApiConfigured()) {
    await updateTransferStatus(id, "RECEIVED");
    return;
  }
  await apiRequest(`${API}/warehouse/transfers/${id}/receive`, { method: "POST", body: body ?? {} });
}

export async function warehousePickPackComplete(id: string): Promise<void> {
  if (!isApiConfigured()) {
    completePickPackOrder(id);
    return;
  }
  await apiRequest(`${API}/warehouse/pick-pack/${id}/complete`, { method: "POST", body: {} });
}

export async function warehousePutawayConfirm(id: string): Promise<void> {
  if (!isApiConfigured()) {
    confirmPutaway(id);
    return;
  }
  await apiRequest(`${API}/warehouse/putaway/${id}/confirm`, { method: "POST", body: {} });
}

export async function warehouseCycleCountSubmit(id: string): Promise<void> {
  if (!isApiConfigured()) {
    submitCycleCount(id);
    return;
  }
  await apiRequest(`${API}/warehouse/cycle-counts/${id}/submit`, { method: "POST", body: {} });
}

// —— Finance ——
export async function periodClose(payload: { periodId?: string; date?: string }): Promise<void> {
  if (!isApiConfigured()) {
    if (payload.periodId) updateFiscalPeriodStatus(payload.periodId, "Closed");
    return;
  }
  await apiRequest(`${API}/finance/period/close`, { method: "POST", body: payload });
}

export async function periodReopen(periodId: string): Promise<void> {
  if (!isApiConfigured()) {
    updateFiscalPeriodStatus(periodId, "Open");
    return;
  }
  await apiRequest(`${API}/finance/period/reopen`, { method: "POST", body: { periodId } });
}

// —— Treasury ——
export async function paymentRunApprove(id: string): Promise<void> {
  if (!isApiConfigured()) {
    updatePaymentRunStatus(id, "APPROVED");
    return;
  }
  await apiRequest(`${API}/treasury/payment-runs/${id}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

// —— Payroll ——
export async function payRunApprove(id: string): Promise<void> {
  if (!isApiConfigured()) {
    approvePayRun(id);
    return;
  }
  await apiRequest(`${API}/payroll/pay-runs/${id}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

// —— Approvals ——
export async function approvalApprove(id: string, comment?: string): Promise<void> {
  if (!isApiConfigured()) {
    updateApprovalStatus(id, "approved");
    return;
  }
  await apiRequest(`${API}/approvals/${id}/approve`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

export async function approvalReject(id: string, comment?: string): Promise<void> {
  if (!isApiConfigured()) {
    updateApprovalStatus(id, "rejected");
    return;
  }
  await apiRequest(`${API}/approvals/${id}/reject`, {
    method: "POST",
    body: comment != null ? { comment } : {},
  });
}

// —— Settings ——
export async function orgSave(payload: Record<string, unknown>): Promise<void> {
  if (!isApiConfigured()) {
    saveOrgProfile({
      name: String(payload.name ?? ""),
      taxId: String(payload.taxId ?? ""),
      registrationNumber: String(payload.registrationNumber ?? ""),
    });
    return;
  }
  await apiRequest(`${API}/org`, { method: "PATCH", body: payload });
}

// —— Products (masters) ——
export async function productDelete(id: string): Promise<void> {
  if (!isApiConfigured()) {
    deleteProductRecord(id);
    return;
  }
  await apiRequest(`${API}/products/${id}`, { method: "DELETE" });
}

export async function productApplyPricingTemplate(productId: string, templateId: string): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest(`${API}/products/${productId}/pricing/apply-template`, {
    method: "POST",
    body: { templateId },
  });
}

// —— Assets ——
export async function runDepreciation(payload?: { period?: string }): Promise<void> {
  if (!isApiConfigured()) {
    recordDepreciationRun(getMockDepreciationPreview(payload?.period));
    return;
  }
  await apiRequest(`${API}/assets/depreciation/run`, { method: "POST", body: payload ?? {} });
}

// —— Purchasing (returns) ——
export async function purchaseReturnCreate(body?: { lines?: unknown[] }): Promise<{ id: string }> {
  if (!isApiConfigured()) {
    const created = createPurchaseReturn({
      date: new Date().toISOString().slice(0, 10),
      party: "Supplier Return",
      total: 0,
      poRef: body?.lines?.length ? "PO-linked" : undefined,
    });
    return { id: created.id };
  }
  return apiRequest<{ id: string }>(`${API}/purchasing/returns`, {
    method: "POST",
    body: body ?? {},
  });
}

export async function purchaseReturnApprove(returnId: string): Promise<void> {
  if (!isApiConfigured()) {
    updatePurchaseReturnStatus(returnId, "APPROVED");
    return;
  }
  await apiRequest(`${API}/purchasing/returns/${returnId}/action`, {
    method: "POST",
    body: { action: "approve" },
  });
}

export function purchaseReturnsExport(onNotAvailable: (msg: string) => void): void {
  if (!isApiConfigured()) {
    downloadTextFile(
      `purchase-returns-${new Date().toISOString().slice(0, 10)}.csv`,
      "number,status\nPRET-001,APPROVED\nPRET-002,DRAFT",
      "text/csv;charset=utf-8"
    );
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
  if (!isApiConfigured()) {
    createThreeWayMatch([], grnLineIds, billLineIds);
    return;
  }
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
  if (!isApiConfigured()) {
    allocateArPayment(
      paymentId,
      Object.fromEntries(body.invoiceIds.map((invoiceId, index) => [invoiceId, body.amounts[index] ?? 0]))
    );
    return;
  }
  await apiRequest(`${API}/ar/payments/${paymentId}/allocate`, {
    method: "POST",
    body,
  });
}

// —— Analytics / Automation (stub only; backend may add later) ——
export async function analyticsApplySuggestion(suggestionId: string, override?: unknown): Promise<void> {
  if (!isApiConfigured()) {
    saveStoredValue("odaflow_analytics_last_applied_suggestion", {
      suggestionId,
      override,
      appliedAt: new Date().toISOString(),
    });
    return;
  }
  await apiRequest(`${API}/analytics/simulations/apply`, {
    method: "POST",
    body: { suggestionId, ...(override != null && { override }) },
  });
}

export async function automationInsightApply(insightId: string, actionId: string): Promise<void> {
  if (!isApiConfigured()) return;
  await apiRequest(`${API}/automation/insights/${insightId}/apply`, {
    method: "POST",
    body: { actionId },
  });
}

export function exportPaymentRunFile(id: string, onNotAvailable: (msg: string) => void): void {
  if (!isApiConfigured()) {
    const run = listPaymentRuns().find((row) => row.id === id);
    const csv = [
      "paymentRun,method,total,currency,status",
      [run?.number ?? id, run?.paymentMethod ?? "", run?.totalAmount ?? 0, run?.currency ?? "KES", run?.status ?? ""]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ].join("\n");
    downloadTextFile(`payment-run-${id}.csv`, csv, "text/csv;charset=utf-8");
    return;
  }
  void downloadFile(
    `${API}/treasury/payment-runs/${encodeURIComponent(id)}/export`,
    `payment-run-${id}.csv`,
    onNotAvailable
  );
}
