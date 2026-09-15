import { apiRequest, downloadFile, requireLiveApi } from "@/lib/api/client";

export type PartyStatementKind = "customer" | "supplier";

export type PartyStatementLine = {
  date: string;
  sourceType: string;
  sourceTypeLabel: string;
  sourceId: string;
  sourceNumber: string;
  description: string;
  debit: number;
  credit: number;
  signedAmount: number;
  balance: number;
  currency: string;
  dueDate?: string;
};

export type PartyStatementAging = {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
};

export type PartyStatement = {
  kind: PartyStatementKind;
  side: "AR" | "AP";
  from: string;
  to: string;
  party: {
    id: string;
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    taxId?: string;
  };
  org: {
    id: string;
    name: string;
  };
  currency: string;
  openingBalance: number;
  closingBalance: number;
  periodDebits: number;
  periodCredits: number;
  lines: PartyStatementLine[];
  aging: PartyStatementAging;
};

function statementPath(kind: PartyStatementKind, partyId: string, suffix = ""): string {
  const base =
    kind === "customer"
      ? `/api/ar/customers/${encodeURIComponent(partyId)}/statement`
      : `/api/ap/suppliers/${encodeURIComponent(partyId)}/statement`;
  return `${base}${suffix}`;
}

function rangeParams(from?: string, to?: string): URLSearchParams {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return params;
}

export async function fetchPartyStatementApi(
  kind: PartyStatementKind,
  partyId: string,
  from?: string,
  to?: string
): Promise<PartyStatement> {
  requireLiveApi(kind === "customer" ? "Customer statement" : "Supplier statement");
  return apiRequest<PartyStatement>(statementPath(kind, partyId), {
    params: rangeParams(from, to),
  });
}

export async function downloadPartyStatementPdfApi(
  kind: PartyStatementKind,
  partyId: string,
  from: string,
  to: string,
  fileName: string,
  onNotAvailable: (message: string) => void
): Promise<boolean> {
  requireLiveApi("Statement PDF");
  const qs = rangeParams(from, to).toString();
  return downloadFile(`${statementPath(kind, partyId, "/pdf")}?${qs}`, fileName, onNotAvailable);
}

export async function emailPartyStatementApi(
  kind: PartyStatementKind,
  partyId: string,
  body: { from: string; to: string; overrideTo?: string }
): Promise<{ sent: boolean; to: string }> {
  requireLiveApi("Statement email");
  return apiRequest<{ sent: boolean; to: string }>(statementPath(kind, partyId, "/email"), {
    method: "POST",
    body,
  });
}

export function defaultStatementDates(now = new Date()): { from: string; to: string } {
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  fromDate.setUTCDate(fromDate.getUTCDate() - 89);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

/** Wide enough that period lines include opening balances and historical postings. */
export function allTimeStatementDates(now = new Date()): { from: string; to: string } {
  return { from: "2000-01-01", to: now.toISOString().slice(0, 10) };
}
