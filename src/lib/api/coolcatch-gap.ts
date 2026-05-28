import { apiRequest } from "./client";

export type CoolcatchReadinessReport = {
  orgId: string;
  orgName: string;
  templateId: string;
  ready: boolean;
  checks: Array<{ id: string; status: "ok" | "warn" | "fail"; message: string; count?: number }>;
};

export async function fetchCoolcatchReadiness(orgId?: string) {
  const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
  return apiRequest<CoolcatchReadinessReport>(`/api/coolcatch/readiness${qs}`);
}

export async function fetchCoolcatchBsInventory() {
  return apiRequest<{
    lines: Array<{
      line: string;
      label: string;
      totalKg: number;
      totalValueKes: number;
    }>;
    asOf: string;
  }>("/api/coolcatch/bs-inventory");
}

export type DispatchAlert = {
  deliveryNoteId: string;
  number?: string;
  dispatchedKg: number;
  hoursUnacknowledged: number;
  outletName?: string;
};

export async function fetchDispatchAlerts(hours = 4) {
  return apiRequest<{ items: DispatchAlert[]; thresholdHours: number }>(
    `/api/coolcatch/dispatch-alerts?hours=${hours}`
  );
}

export async function createSourcingBatch(body: Record<string, unknown>) {
  return apiRequest<{ batchId: string; empPerKg: number }>("/api/coolcatch/sourcing-batches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function generateMonthEnd(periodMonth: string) {
  return apiRequest<{ id: string }>("/api/coolcatch/month-end/generate", {
    method: "POST",
    body: JSON.stringify({ periodMonth }),
  });
}

export async function exportCoolcatchAnalytics() {
  return apiRequest<Record<string, unknown>>("/api/coolcatch/analytics/export", { method: "POST" });
}

export type MpesaUnmatchedPayment = {
  id: string;
  transactionId: string;
  phone?: string;
  amount: number;
  currency?: string;
  transactedAt: string;
  shortCode?: string;
  billRef?: string;
  status: "UNMATCHED" | "MATCHED";
  matchedDocumentId?: string;
  matchedDocumentNumber?: string;
};

export async function fetchMpesaUnmatchedPayments(): Promise<MpesaUnmatchedPayment[]> {
  const payload = await apiRequest<{ items: MpesaUnmatchedPayment[] }>("/api/coolcatch/mpesa/unmatched");
  return payload.items ?? [];
}

export async function matchMpesaPayment(paymentId: string, documentId: string): Promise<void> {
  await apiRequest(`/api/coolcatch/mpesa/${encodeURIComponent(paymentId)}/match`, {
    method: "POST",
    body: JSON.stringify({ documentId }),
  });
}

export type SourcingBatchRow = {
  id: string;
  batchNumber: string;
  sourcingModel: string;
  supplierName?: string;
  inputKg: number;
  sellableKg: number;
  empPerKg: number;
  sourcingDate: string;
};

export async function fetchSourcingBatches() {
  return apiRequest<{ items: SourcingBatchRow[] }>("/api/coolcatch/sourcing-batches");
}

export type MonthEndReconciliation = {
  id: string;
  periodMonth: string;
  status: string;
  outletLines?: Array<{
    outletOrgId: string;
    outletName?: string;
    varianceKg?: number;
    varianceKes?: number;
    commissionKes?: number;
    netSettlementKes?: number;
  }>;
};

export async function fetchMonthEndReconciliations(periodMonth?: string) {
  const qs = periodMonth ? `?periodMonth=${encodeURIComponent(periodMonth)}` : "";
  return apiRequest<{ items: MonthEndReconciliation[] }>(`/api/coolcatch/month-end${qs}`);
}

export async function postMonthEndReconciliation(id: string) {
  return apiRequest<{ journalId?: string }>(`/api/coolcatch/month-end/${encodeURIComponent(id)}/post`, {
    method: "POST",
  });
}

export type BsMovementRow = {
  id: string;
  trigger: string;
  fromLine?: string;
  toLine?: string;
  qtyKg: number;
  valueKes: number;
  empPerKg?: number;
  createdAt: string;
};

export async function fetchBsMovements() {
  return apiRequest<{ items: BsMovementRow[] }>("/api/coolcatch/bs-movements");
}

export async function issueEtimsReceipt(body: {
  sourceType: "invoice" | "sales-order";
  sourceDocumentId: string;
  receiptType?: "GENERIC" | "ETIMS";
}) {
  return apiRequest<{ fiscalReceiptNumber?: string; fiscalPin?: string; qrPayload?: string }>(
    "/api/coolcatch/etims/issue",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function retryEtimsQueue() {
  return apiRequest<{ retried: number }>("/api/coolcatch/etims/retry-queue", { method: "POST" });
}

export type ChaseListItem = {
  id: string;
  name: string;
  phone?: string;
  status: string;
  bdRepName?: string;
  assignedOutletOrgId?: string;
  assignedOutletName?: string;
  capturedAt?: string | null;
  createdAt: string;
};

export async function fetchHqChaseList(params?: { outletOrgId?: string; bdRepId?: string }) {
  const qs = new URLSearchParams();
  if (params?.outletOrgId) qs.set("outletOrgId", params.outletOrgId);
  if (params?.bdRepId) qs.set("bdRepId", params.bdRepId);
  const q = qs.toString();
  return apiRequest<{ items: ChaseListItem[] }>(`/api/franchise/chase-list${q ? `?${q}` : ""}`);
}
