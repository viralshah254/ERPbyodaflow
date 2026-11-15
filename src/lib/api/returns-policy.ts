import { apiRequest } from "./client";

export const RETURN_ACTIONS = ["BACK_ON_SALE", "INSPECT_FIRST", "REWORK", "NEVER_RESELL"] as const;
export type ReturnAction = (typeof RETURN_ACTIONS)[number];

export const RETURN_ACTION_LABELS: Record<ReturnAction, { label: string; hint: string }> = {
  BACK_ON_SALE: { label: "Back on sale", hint: "Good returns go straight back into the store they came from." },
  INSPECT_FIRST: { label: "Inspect first", hint: "Held in the quarantine store with a quality case until someone passes or rejects them." },
  REWORK: { label: "Rework", hint: "Held in quarantine with a rework case (e.g. repack or relabel), then released." },
  NEVER_RESELL: { label: "Never resell", hint: "Go to the damaged store with a write-off case for approval." },
};

export type ReturnReason = { code: string; label: string; action?: ReturnAction; damaged?: boolean; active: boolean };

export type ReturnsPolicy = {
  defaultAction: ReturnAction;
  perishableShelfLifeDays: number;
  byCategory: Record<string, ReturnAction>;
  reasons: ReturnReason[];
  returnsAllowancePercent: number;
  configured: boolean;
};

export async function fetchReturnsPolicyApi(): Promise<ReturnsPolicy> {
  return apiRequest<ReturnsPolicy>("/api/settings/sales/returns-policy");
}

export async function saveReturnsPolicyApi(policy: ReturnsPolicy): Promise<ReturnsPolicy> {
  return apiRequest<ReturnsPolicy>("/api/settings/sales/returns-policy", { method: "PUT", body: policy });
}

export type ReturnsAllowanceRow = {
  partyId: string;
  customerName: string;
  sales: number;
  returns: number;
  percent: number;
  overAllowance: boolean;
};

export async function fetchReturnsAllowanceApi(month: string): Promise<{ month: string; allowancePercent: number; rows: ReturnsAllowanceRow[] }> {
  return apiRequest(`/api/sales/returns-allowance?month=${encodeURIComponent(month)}`);
}
