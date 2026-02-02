/**
 * Mock data for /finance/bank-recon: session, statement lines, system transactions.
 */

export interface ReconcileSession {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  statementCurrency: string;
  baseCurrency: string;
  status: "OPEN" | "RECONCILED";
}

export interface BankStatementLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  matchedId?: string | null;
  currency?: string;
}

export interface SystemTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  amount: number;
  matchedId?: string | null;
}

export const MOCK_RECONCILE_SESSION: ReconcileSession = {
  id: "session-1",
  bankAccountId: "ba1",
  bankAccountName: "Operating KES",
  statementCurrency: "KES",
  baseCurrency: "KES",
  status: "OPEN",
};

export const MOCK_STATEMENT_LINES: BankStatementLine[] = [
  { id: "s1", date: "2025-01-18", description: "Customer payment INV-001", amount: 125000, balance: 500000, matchedId: "t1", currency: "KES" },
  { id: "s2", date: "2025-01-19", description: "Bank charges", amount: -500, matchedId: null, currency: "KES" },
  { id: "s3", date: "2025-01-20", description: "Transfer from savings", amount: 100000, matchedId: null, currency: "KES" },
  { id: "s4", date: "2025-01-21", description: "USD wire received", amount: 1000, matchedId: null, currency: "USD" },
];

export const MOCK_SYSTEM_TRANSACTIONS: SystemTransaction[] = [
  { id: "t1", date: "2025-01-18", reference: "INV-001", description: "Receipt from ABC Ltd", amount: 125000, matchedId: "s1" },
  { id: "t2", date: "2025-01-19", reference: "JE-001", description: "Bank charges", amount: -500, matchedId: null },
];

export function getMockStatementLines(): BankStatementLine[] {
  return [...MOCK_STATEMENT_LINES];
}

export function getMockReconcileSession(): ReconcileSession {
  return { ...MOCK_RECONCILE_SESSION };
}

export function getMockSystemTransactions(): SystemTransaction[] {
  return [...MOCK_SYSTEM_TRANSACTIONS];
}
