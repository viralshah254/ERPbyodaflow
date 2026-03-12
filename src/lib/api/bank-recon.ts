import {
  createBankReconPaymentFromStatement,
  getBankReconSession,
  listStatementLines,
  listSystemTransactions,
  matchBankReconLines,
} from "@/lib/data/bank-recon.repo";
import type {
  BankStatementLine,
  ReconcileSession,
  SystemTransaction,
} from "@/lib/mock/bank-recon";
import { apiRequest, isApiConfigured } from "./client";

export type { BankStatementLine, ReconcileSession, SystemTransaction };

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
  reference?: string;
};

type BackendPayment = {
  id: string;
  number: string;
  date: string;
  partyId: string;
  amount: number;
};

export type BankReconSnapshot = {
  bankAccounts: BankAccount[];
  session: ReconcileSession;
  statements: BankStatementLine[];
  systemTxns: SystemTransaction[];
};

function buildSession(
  bankAccounts: BankAccount[],
  bankAccountId?: string,
  statements: BankStatementLine[] = []
): ReconcileSession {
  const selected = bankAccounts.find((item) => item.id === bankAccountId) ?? bankAccounts[0];
  return {
    id: selected?.id ?? "bank-recon",
    bankAccountId: selected?.id ?? "",
    bankAccountName: selected?.name ?? "Bank account",
    statementCurrency: selected?.currency ?? "KES",
    baseCurrency: selected?.currency ?? "KES",
    status: statements.every((line) => line.matchedId) ? "RECONCILED" : "OPEN",
  };
}

export async function fetchBankReconSnapshotApi(
  bankAccountId?: string
): Promise<BankReconSnapshot> {
  if (!isApiConfigured()) {
    return {
      bankAccounts: [
        {
          id: getBankReconSession().bankAccountId,
          name: getBankReconSession().bankAccountName,
          currency: getBankReconSession().statementCurrency,
        },
      ],
      session: getBankReconSession(),
      statements: listStatementLines(),
      systemTxns: listSystemTransactions(),
    };
  }

  const [bankAccountsRes, statementsRes, paymentsRes] = await Promise.all([
    apiRequest<{ items: BankAccount[] }>("/api/treasury/bank-accounts"),
    apiRequest<{ items: BackendBankStatementLine[] }>("/api/finance/bank-recon", {
      params: bankAccountId ? { bankAccountId } : undefined,
    }),
    apiRequest<{ items: BackendPayment[] }>("/api/finance/payments"),
  ]);

  const statementByPayment = new Map(
    statementsRes.items
      .filter((item) => item.matchedPaymentId)
      .map((item) => [item.matchedPaymentId as string, item.id])
  );

  const statements: BankStatementLine[] = statementsRes.items.map((item) => ({
    id: item.id,
    date: item.statementDate.slice(0, 10),
    description: item.description ?? item.reference ?? "Statement line",
    amount: item.amount,
    balance: item.balance,
    matchedId: item.matchedPaymentId ?? null,
    currency:
      bankAccountsRes.items.find((account) => account.id === item.bankAccountId)?.currency ?? "KES",
  }));

  const systemTxns: SystemTransaction[] = paymentsRes.items.map((item) => ({
    id: item.id,
    date: item.date.slice(0, 10),
    reference: item.number,
    description: item.partyId,
    amount: item.amount,
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
  if (!isApiConfigured()) {
    matchBankReconLines(statementId, paymentId);
    return;
  }
  await apiRequest("/api/finance/bank-recon/match", {
    method: "POST",
    body: { lineId: statementId, paymentId },
  });
}

export async function createBankReconPaymentFromStatementApi(
  line: BankStatementLine,
  bankAccountId?: string
): Promise<void> {
  if (!isApiConfigured()) {
    createBankReconPaymentFromStatement(line.id);
    return;
  }
  const path = line.amount >= 0 ? "/api/ar/payments" : "/api/ap/payments";
  await apiRequest(path, {
    method: "POST",
    body: {
      date: line.date,
      partyId: line.description || `statement-${line.id}`,
      amount: Math.abs(line.amount),
      currency: line.currency ?? "KES",
      bankAccountId,
    },
  });
}
