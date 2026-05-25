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
  return apiRequest<{ lines: Array<{ line: string; valueKes: number; qtyKg: number }>; asOf: string }>(
    "/api/coolcatch/bs-inventory"
  );
}

export async function fetchDispatchAlerts(hours = 4) {
  return apiRequest<{ items: unknown[]; thresholdHours: number }>(
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
