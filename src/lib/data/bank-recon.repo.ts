import {
  MOCK_RECONCILE_SESSION,
  MOCK_STATEMENT_LINES,
  MOCK_SYSTEM_TRANSACTIONS,
  type BankStatementLine,
  type ReconcileSession,
  type SystemTransaction,
} from "@/lib/mock/bank-recon";
import { createApPayment } from "@/lib/data/ap-payments.repo";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const SESSION_KEY = "odaflow_bank_recon_session";
const STATEMENT_KEY = "odaflow_bank_recon_statement";
const SYSTEM_KEY = "odaflow_bank_recon_system";

function seedSession(): ReconcileSession {
  return { ...MOCK_RECONCILE_SESSION };
}

function seedStatementLines(): BankStatementLine[] {
  return MOCK_STATEMENT_LINES.map((row) => ({ ...row }));
}

function seedSystemTransactions(): SystemTransaction[] {
  return MOCK_SYSTEM_TRANSACTIONS.map((row) => ({ ...row }));
}

export function getBankReconSession(): ReconcileSession {
  return loadStoredValue(SESSION_KEY, seedSession);
}

export function listStatementLines(): BankStatementLine[] {
  return loadStoredValue(STATEMENT_KEY, seedStatementLines).map((row) => ({ ...row }));
}

export function listSystemTransactions(): SystemTransaction[] {
  return loadStoredValue(SYSTEM_KEY, seedSystemTransactions).map((row) => ({ ...row }));
}

export function matchBankReconLines(statementId: string, systemId: string): void {
  saveStoredValue(
    STATEMENT_KEY,
    listStatementLines().map((line) => (line.id === statementId ? { ...line, matchedId: systemId } : line))
  );
  saveStoredValue(
    SYSTEM_KEY,
    listSystemTransactions().map((line) => (line.id === systemId ? { ...line, matchedId: statementId } : line))
  );
}

export function createBankReconPaymentFromStatement(lineId: string): void {
  const line = listStatementLines().find((item) => item.id === lineId);
  if (!line) return;
  createApPayment({
    party: line.description,
    amount: Math.abs(line.amount),
  });
}

