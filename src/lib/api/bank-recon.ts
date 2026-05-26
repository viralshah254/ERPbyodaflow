import { fetchOpenBillsApi, fetchOpenInvoicesApi } from "./payments";
import type {
  BankReconOpenItemSuggestion,
  BankStatementLine,
  ReconcileSession,
  SystemTransaction,
} from "@/lib/types/bank-recon";
import { apiRequest, requireLiveApi } from "./client";

export type { BankStatementLine, ReconcileSession, SystemTransaction, BankReconOpenItemSuggestion };

type BankAccount = {
  id: string;
  name: string;
  currency: string;
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
  id: string;
  number: string;
  date: string;
  partyId: string;
  partyName?: string;
  amount: number;
  type?: "AR_RECEIPT" | "AP_PAYMENT";
};

export type BankReconSnapshot = {
  bankAccounts: BankAccount[];
  session: ReconcileSession;
  statements: BankStatementLine[];
  systemTxns: SystemTransaction[];
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
  bankAccountId?: string
): Promise<BankReconSnapshot> {
  requireLiveApi("Bank reconciliation");

  const [bankAccountsRes, statementsRes, paymentsRes] = await Promise.all([
    apiRequest<{ items: BankAccount[] }>("/api/treasury/bank-accounts"),
    apiRequest<{ items: BackendBankStatementLine[] }>("/api/finance/bank-recon", {
      params: bankAccountId ? { bankAccountId } : undefined,
    }),
    apiRequest<{ items: BackendPayment[] }>("/api/finance/payments", {
      params: bankAccountId ? { bankAccountId } : undefined,
    }),
  ]);

  const accountCurrency = (id: string) =>
    bankAccountsRes.items.find((account) => account.id === id)?.currency ?? "KES";

  const statementByPayment = new Map(
    statementsRes.items
      .filter((item) => item.matchedPaymentId)
      .map((item) => [item.matchedPaymentId as string, item.id])
  );

  const statements: BankStatementLine[] = statementsRes.items.map((item) =>
    toStatementLine(item, accountCurrency(item.bankAccountId))
  );

  const systemTxns: SystemTransaction[] = paymentsRes.items.map((item) => ({
    id: item.id,
    date: item.date.slice(0, 10),
    reference: item.number,
    description: item.partyName ?? item.partyId,
    amount: item.amount * (item.type === "AP_PAYMENT" ? -1 : 1),
    matchedId: statementByPayment.get(item.id) ?? null,
  }));

  const session = buildSession(bankAccountsRes.items, bankAccountId, statements);
  return {
    bankAccounts: bankAccountsRes.items,
    session,
    statements,
    systemTxns,
  };
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
): Promise<{ paymentId: string; number: string; documentId: string }> {
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
): Promise<{ matched: number; alreadyMatched: number; unmatched: number }> {
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

export async function fetchBankReconOpenItemsApi(params: {
  direction: "AR" | "AP";
  partyId?: string;
}) {
  if (!params.partyId) return [];
  return params.direction === "AR"
    ? fetchOpenInvoicesApi(params.partyId)
    : fetchOpenBillsApi(params.partyId);
}
