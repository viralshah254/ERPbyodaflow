import { fetchOpenBillsApi, fetchOpenInvoicesApi } from "./payments";
import type {
  BankReconOpenItemSuggestion,
  BankReconciliationSessionRecord,
  BankStatementLine,
  ReconcileSession,
  SystemTransaction,
} from "@/lib/types/bank-recon";
import { statementReadyBankAccount, tidyCounterpartyName } from "@/lib/finance/bank-account-label";
import { apiRequest, requireLiveApi } from "./client";

export type { BankStatementLine, ReconcileSession, SystemTransaction, BankReconOpenItemSuggestion };

type BankAccount = {
  id: string;
  name: string;
  currency: string;
  accountNumber?: string;
  bankName?: string;
  bank?: string;
  usesStatement?: boolean;
};

type BackendBankStatementLine = {
  id: string;
  bankAccountId: string;
  statementDate: string;
  description?: string;
  amount: number;
  balance?: number;
  status: "PENDING" | "MATCHED";
  matchedPaymentId?: string;
  matchedDocumentId?: string;
  reference?: string;
};

type BackendPayment = {
  bankSettlement?: { bankAmount: number; bankCurrency: string };
  id: string;
  number: string;
  date: string;
  partyId: string;
  partyName?: string;
  amount: number;
  currency?: string;
  type?: "AR_RECEIPT" | "AP_PAYMENT";
  allocations?: Array<{ documentType?: string; documentId: string; documentNumber?: string; amount: number }>;
};

export type BankReconPosition = {
  bookBalance: number | null;
  currency: string;
  glAccountCode?: string;
  glAccountName?: string;
  note?: string;
  outstanding: Array<{ paymentId: string; reason: string }>;
};

export type BankReconSnapshot = {
  bankAccounts: BankAccount[];
  cashAccounts: BankAccount[];
  session: ReconcileSession;
  statements: BankStatementLine[];
  systemTxns: SystemTransaction[];
  position: BankReconPosition | null;
};

function toStatementLine(
  item: BackendBankStatementLine,
  currency: string
): BankStatementLine {
  const amount = item.amount;
  return {
    id: item.id,
    date: item.statementDate.slice(0, 10),
    description: item.description ?? item.reference ?? "Statement line",
    amount,
    payIn: amount > 0 ? amount : 0,
    payOut: amount < 0 ? Math.abs(amount) : 0,
    balance: item.balance,
    reference: item.reference,
    matchedId: item.matchedPaymentId ?? null,
    matchedDocumentId: item.matchedDocumentId ?? null,
    status: item.status,
    currency,
  };
}

function buildSession(
  bankAccounts: BankAccount[],
  bankAccountId?: string,
  statements: BankStatementLine[] = []
): ReconcileSession {
  const selected = bankAccounts.find((item) => item.id === bankAccountId) ?? bankAccounts[0];
  const unmatched = statements.filter((line) => line.status !== "MATCHED");
  return {
    id: selected?.id ?? "bank-recon",
    bankAccountId: selected?.id ?? "",
    bankAccountName: selected?.name ?? "Bank account",
    statementCurrency: selected?.currency ?? "KES",
    baseCurrency: selected?.currency ?? "KES",
    status: statements.length > 0 && unmatched.length === 0 ? "RECONCILED" : "OPEN",
  };
}

export async function fetchBankReconSnapshotApi(
  bankAccountId?: string,
  opts?: { dateFrom?: string; dateTo?: string }
): Promise<BankReconSnapshot> {
  requireLiveApi("Bank reconciliation");

  const bankAccountsRes = await apiRequest<{ items: BankAccount[] }>("/api/treasury/bank-accounts");
  const prepared = bankAccountsRes.items.map((account) => {
    const ready = statementReadyBankAccount(account);
    return { ...account, name: ready.name, bank: ready.bank, accountNumber: ready.accountNumber, usesStatement: ready.usesStatement };
  });
  const statementAccounts = prepared.filter((account) => account.usesStatement !== false);
  const cashAccounts = prepared.filter((account) => account.usesStatement === false);
  const selectedAccount = bankAccountId ? statementAccounts.find((account) => account.id === bankAccountId) : statementAccounts[0];
  if (bankAccountId && !selectedAccount) throw new Error("The selected bank account is no longer available. Refresh and select an account.");
  const statementParams: Record<string, string> = { bankAccountId: selectedAccount?.id ?? "" };
  if (opts?.dateFrom) statementParams.dateFrom = opts.dateFrom;
  if (opts?.dateTo) statementParams.dateTo = opts.dateTo;
  const [statementsRes, paymentsRes, position] = selectedAccount ? await Promise.all([
    apiRequest<{ items: BackendBankStatementLine[] }>("/api/finance/bank-recon", { params: statementParams }),
    apiRequest<{ items: BackendPayment[] }>("/api/finance/payments", { params: { bankAccountId: selectedAccount.id } }),
    fetchBankReconPositionApi(selectedAccount.id, opts?.dateTo),
  ]) : [{ items: [] as BackendBankStatementLine[] }, { items: [] as BackendPayment[] }, null];

  const accountCurrency = (id: string) =>
    prepared.find((account) => account.id === id)?.currency ?? "KES";

  const statementByPayment = new Map(
    statementsRes.items
      .filter((item) => item.matchedPaymentId)
      .map((item) => [item.matchedPaymentId as string, item.id])
  );

  const statements: BankStatementLine[] = statementsRes.items.map((item) =>
    toStatementLine(item, accountCurrency(item.bankAccountId))
  );

  const outstandingByPayment = new Map((position?.outstanding ?? []).map((mark) => [mark.paymentId, mark.reason]));
  const systemTxns: SystemTransaction[] = paymentsRes.items.map((item) => ({
    id: item.id,
    date: item.date.slice(0, 10),
    reference: item.number,
    description: tidyCounterpartyName(item.partyName ?? item.partyId),
    amount: (item.bankSettlement?.bankAmount ?? item.amount) * (item.type === "AP_PAYMENT" ? -1 : 1),
    currency: item.bankSettlement?.bankCurrency ?? item.currency,
    type: item.type,
    matchedId: statementByPayment.get(item.id) ?? null,
    outstandingReason: outstandingByPayment.get(item.id) ?? null,
    allocations: item.allocations,
  }));

  const session = buildSession(statementAccounts, bankAccountId, statements);
  return {
    bankAccounts: statementAccounts,
    cashAccounts,
    session,
    statements,
    systemTxns,
    position,
  };
}

async function fetchBankReconPositionApi(bankAccountId: string, asOf?: string): Promise<BankReconPosition | null> {
  try {
    const result = await apiRequest<Partial<BankReconPosition>>("/api/finance/bank-recon/position", {
      params: { bankAccountId, ...(asOf ? { asOf } : {}) },
    });
    return {
      bookBalance: typeof result.bookBalance === "number" ? result.bookBalance : null,
      currency: result.currency ?? "KES",
      glAccountCode: result.glAccountCode,
      glAccountName: result.glAccountName,
      note: result.note,
      outstanding: Array.isArray(result.outstanding) ? result.outstanding : [],
    };
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}

export async function matchBankReconLinesApi(
  statementId: string,
  paymentId: string
): Promise<void> {
  requireLiveApi("Bank reconciliation matching");
  await apiRequest("/api/finance/bank-recon/match", {
    method: "POST",
    body: { lineId: statementId, paymentId },
  });
}

export async function matchBankReconToDocumentApi(
  lineId: string,
  documentId: string
): Promise<{ paymentId: string; number: string; documentId: string; replayed?: boolean }> {
  requireLiveApi("Bank reconciliation document matching");
  return apiRequest("/api/finance/bank-recon/match-document", {
    method: "POST",
    body: { lineId, documentId },
  });
}

export async function fetchBankReconSuggestionsApi(
  lineId: string
): Promise<BankReconOpenItemSuggestion[]> {
  requireLiveApi("Bank reconciliation suggestions");
  const res = await apiRequest<{ items: BankReconOpenItemSuggestion[] }>(
    "/api/finance/bank-recon/suggestions",
    { params: { lineId } }
  );
  return res.items;
}

export async function autoMatchBankReconApi(
  bankAccountId: string
): Promise<{ matched: number; alreadyMatched: number; unmatched: number; statementLines?: number }> {
  requireLiveApi("Bank reconciliation auto-match");
  return apiRequest("/api/finance/bank-recon/auto-match", {
    method: "POST",
    body: { bankAccountId },
  });
}

export async function createBankReconPaymentFromStatementApi(
  line: BankStatementLine,
  partyId: string,
  allocations?: { documentId: string; amount: number }[]
): Promise<{ paymentId: string; number: string }> {
  requireLiveApi("Bank reconciliation payment creation");
  return apiRequest<{ paymentId: string; number: string }>("/api/finance/bank-recon/create-payment", {
    method: "POST",
    body: {
      lineId: line.id,
      partyId,
      allocations,
    },
  });
}

export async function createBankReconAdjustingEntryApi(lineId: string): Promise<{ journalId: string; number: string }> {
  requireLiveApi("Bank reconciliation adjusting entry");
  return apiRequest<{ journalId: string; number: string }>("/api/finance/bank-recon/adjusting-entry", {
    method: "POST",
    body: { lineId },
  });
}

export async function completeBankReconApi(body: {
  bankAccountId: string;
  periodStart?: string;
  periodEnd?: string;
  openingBalance?: number;
  closingBalance?: number;
}): Promise<{ sessionId: string; matchedCount: number; unmatchedCount: number }> {
  requireLiveApi("Bank reconciliation completion");
  return apiRequest("/api/finance/bank-recon/complete", {
    method: "POST",
    body,
  });
}

export async function fetchBankReconSessionsApi(
  bankAccountId?: string
): Promise<BankReconciliationSessionRecord[]> {
  requireLiveApi("Bank reconciliation sessions");
  const res = await apiRequest<{ items: BankReconciliationSessionRecord[] }>(
    "/api/finance/bank-recon/sessions",
    { params: bankAccountId ? { bankAccountId } : undefined }
  );
  return res.items ?? [];
}

export async function fetchBankReconOpenItemsApi(params: {
  direction: "AR" | "AP";
  partyId?: string;
}) {
  if (!params.partyId) return [];
  return params.direction === "AR"
    ? fetchOpenInvoicesApi(params.partyId)
    : fetchOpenBillsApi(params.partyId);
}

export type BankAllocationProposal = {
  _id: string;
  statementLineId: string;
  partyId: string;
  allocations: Array<{ documentId: string; amount: number }>;
  source: "MANUAL" | "GAIA";
  rationale?: string;
  status: "SUGGESTED" | "APPROVED" | "POSTED" | "CLOSED";
  paymentId?: string;
  suggestedBy?: string;
  approvedBy?: string;
  postedBy?: string;
  settlementTerms?: SettlementTerms;
  settlementPreview?: SettlementPreview;
};

export async function suggestBankAllocationApi(body: {
  statementLineId: string;
  partyId: string;
  allocations: Array<{ documentId: string; amount: number }>;
  source?: "MANUAL" | "GAIA";
  rationale?: string;
  settlementTerms?: SettlementTerms;
  previewDigest?: string;
}) {
  return apiRequest<{ id: string; status: string }>("/api/finance/bank-recon/allocation-proposals", {
    method: "POST",
    body,
  });
}

export async function fetchBankAllocationProposalsApi(statementLineId?: string) {
  const result = await apiRequest<{ items: BankAllocationProposal[] }>(
    "/api/finance/bank-recon/allocation-proposals",
    { params: statementLineId ? { statementLineId } : undefined },
  );
  return result.items ?? [];
}

export async function advanceBankAllocationProposalApi(
  id: string,
  action: "approve" | "post" | "close",
) {
  return apiRequest<{ id: string; status: string; paymentId?: string }>(
    `/api/finance/bank-recon/allocation-proposals/${encodeURIComponent(id)}/action`,
    { method: "POST", body: { action } },
  );
}

export async function markBankReconOutstandingApi(body: { bankAccountId: string; paymentId: string; reason: string }): Promise<void> {
  requireLiveApi("Leave a book item outstanding");
  await apiRequest("/api/finance/bank-recon/outstanding", { method: "POST", body });
}

export async function clearBankReconOutstandingApi(paymentId: string): Promise<void> {
  requireLiveApi("Clear an outstanding book item");
  await apiRequest("/api/finance/bank-recon/outstanding", { method: "DELETE", body: { paymentId } });
}

export async function fetchControlAccountReconciliationApi() {
  const result = await apiRequest<{
    items: Array<{
      side: "AR" | "AP";
      controlAccountCode: string;
      controlAccountName?: string;
      glBalance?: number;
      subledgerBalance?: number;
      difference?: number;
      reconciled?: boolean;
      error?: string;
      mappingsHref?: string;
    }>;
  }>("/api/finance/control-account-reconciliation");
  return result.items ?? [];
}

export type SettlementTerms = { reverseRevaluations?: boolean; feeBankAmount: number; invoiceToBankRate: number; bankToBaseRate: number; feeAccountId?: string; fxGainAccountId?: string; fxLossAccountId?: string; evidenceReference: string };
export type SettlementPreview = { statement: { amount: number }; digest: string; invoiceCurrency: string; bankCurrency: string; baseCurrency: string; totalAllocated: number; equation: { bankBase: number; feeBase: number; carryingBase: number; fxGain: number }; sources: Array<{ id: string; number: string; currency: string; amount: number; originalRate: number; carryingBase: number }>; accounts: Array<{ id: string; code: string; name: string; type: string }>; legs: Array<{ accountId: string; debit: number; credit: number; description: string }> };
export async function previewBankSettlementApi(body: { lineId: string; partyId: string; allocations: Array<{ documentId: string; amount: number }>; terms: SettlementTerms }) {
  return apiRequest<SettlementPreview>("/api/finance/bank-recon/settlement-preview", { method: "POST", body });
}
