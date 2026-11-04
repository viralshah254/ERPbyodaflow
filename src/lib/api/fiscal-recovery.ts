import { apiRequest, requireLiveApi } from "./client";
import type { KraSigningRecord } from "@/lib/kra/kra-signing";
export type FiscalRecoveryAttempt = {
  _id: string; documentId: string; typeKey: string; provider: "incotex" | "etims_oscu";
  state: "PREPARED" | "DISPATCHING" | "UNCERTAIN" | "SIGNED" | "POSTED" | "RELEASED";
  generation: number; documentHash: string; payloadHash?: string; payload?: Record<string, unknown>; requestNumber?: number;
  createdAt: string; updatedAt: string; dispatchedAt?: string; error?: string; receipt?: KraSigningRecord;
  review?: { digest: string; outcome: "ACCEPTED" | "NOT_ACCEPTED"; reason: string; evidenceReference: string; proposedBy: string; proposedAt: string };
};
export type FiscalRecoveryProposal = { outcome: "ACCEPTED" | "NOT_ACCEPTED"; reason: string; evidenceReference: string; receipt?: KraSigningRecord; providerLastInvoiceNumber?: number };
export async function fetchFiscalRecovery(documentId?: string) {
  requireLiveApi("Fiscal recovery");
  const result = await apiRequest<{ contract: string; rows: FiscalRecoveryAttempt[]; hasMore: boolean }>("/api/kra/fiscal-recovery", { params: documentId ? new URLSearchParams({ documentId }) : undefined });
  if (result.contract !== "fiscal-recovery-v1") throw new Error("Fiscal recovery needs the updated ERP backend. Refresh after deployment.");
  return result;
}
export async function fetchFiscalAttempt(id: string) {
  const result = await apiRequest<{ contract: string; attempt: FiscalRecoveryAttempt }>(`/api/kra/fiscal-recovery/${encodeURIComponent(id)}`);
  if (result.contract !== "fiscal-recovery-v1") throw new Error("The fiscal recovery backend is unavailable.");
  return result.attempt;
}
export async function proposeFiscalOutcome(id: string, proposal: FiscalRecoveryProposal) {
  return apiRequest(`/api/kra/fiscal-recovery/${encodeURIComponent(id)}/propose`, { method: "POST", body: proposal });
}
export async function approveFiscalOutcome(id: string, proposalDigest: string) {
  return apiRequest(`/api/kra/fiscal-recovery/${encodeURIComponent(id)}/approve`, { method: "POST", body: { proposalDigest } });
}
