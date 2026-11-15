import { apiRequest, requireLiveApi } from "./client";

export type MatchingMode = "OFF" | "SHADOW" | "AUTO";
export type PaymentMatchingSettings = { mode: MatchingMode; autoPostThreshold: number; minimumMargin: number };
export type MatchSignal = { code: string; label: string; weight: number };

export type MatchCandidate = {
  candidateType: "invoice" | "payment";
  candidateId: string;
  candidateNumber?: string;
  partyId?: string;
  partyName?: string;
  openAmount: number;
  score: number;
  signals: MatchSignal[];
};

export type MatchSuggestionRow = {
  _id: string;
  statementLineId: string;
  candidateType: "invoice" | "payment";
  candidateId: string;
  candidateNumber?: string;
  partyId?: string;
  amount: number;
  score: number;
  runnerUpScore: number;
  signals: MatchSignal[];
  wouldAutoPost: boolean;
  createdAt: string;
};

export type MatchingRunSummary = {
  mode: MatchingMode;
  scanned: number;
  suggested: number;
  wouldAutoPost: number;
  autoPosted: number;
  failed: number;
  errors: string[];
};

export type MatchingAccuracy = {
  suggestions: number;
  autoPosted: number;
  confirmed: number;
  rejected: number;
  highConfidenceDecided: number;
  highConfidenceAccuracy: number | null;
};

export async function fetchPaymentMatchingSettingsApi(): Promise<PaymentMatchingSettings> {
  return apiRequest("/api/finance/payment-matching/settings");
}

export async function savePaymentMatchingSettingsApi(body: PaymentMatchingSettings): Promise<PaymentMatchingSettings> {
  return apiRequest("/api/finance/payment-matching/settings", { method: "PUT", body });
}

export async function fetchMatchingAccuracyApi(): Promise<MatchingAccuracy> {
  return apiRequest("/api/finance/payment-matching/accuracy");
}

export async function fetchMatchSuggestionsApi(bankAccountId: string): Promise<MatchSuggestionRow[]> {
  const res = await apiRequest<{ items: MatchSuggestionRow[] }>("/api/finance/payment-matching/suggestions", { params: { bankAccountId } });
  return res.items ?? [];
}

export async function fetchLineCandidatesApi(lineId: string): Promise<MatchCandidate[]> {
  const res = await apiRequest<{ items: MatchCandidate[] }>("/api/finance/payment-matching/suggestions", { params: { lineId } });
  return res.items ?? [];
}

export async function runPaymentMatchingApi(bankAccountId: string): Promise<MatchingRunSummary> {
  requireLiveApi("Payment matching");
  return apiRequest("/api/finance/payment-matching/run", { method: "POST", body: { bankAccountId } });
}

export async function confirmPaymentMatchApi(body: { lineId: string; candidateType: "invoice" | "payment"; candidateId: string }): Promise<{ paymentId: string }> {
  requireLiveApi("Payment matching");
  return apiRequest("/api/finance/payment-matching/confirm", { method: "POST", body });
}

export function describeMatchingRun(result: MatchingRunSummary): string {
  if (result.mode === "OFF") return "";
  if (result.mode === "SHADOW") {
    return `Matching (practice mode): ${result.suggested} suggestion(s), ${result.wouldAutoPost} would have posted on their own.`;
  }
  return `Matching: ${result.autoPosted} posted on their own, ${result.suggested} waiting for review${result.failed ? `, ${result.failed} could not post` : ""}.`;
}
