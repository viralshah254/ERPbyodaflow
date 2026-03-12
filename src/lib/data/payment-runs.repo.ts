import {
  type BillDueRow,
  type PaymentMethod,
  type PaymentRunRow,
  MOCK_BILLS_DUE,
  MOCK_PAYMENT_RUNS,
} from "@/lib/mock/treasury/payment-runs";
import { appendStoredItem, loadStoredValue, saveStoredValue, updateStoredCollection } from "@/lib/data/persisted-store";

const RUNS_KEY = "odaflow_payment_runs";

function seedRuns(): PaymentRunRow[] {
  return MOCK_PAYMENT_RUNS.map((run) => ({ ...run }));
}

export function listPaymentRuns(): PaymentRunRow[] {
  return loadStoredValue(RUNS_KEY, seedRuns).map((run) => ({ ...run }));
}

export function listBillsDue(): BillDueRow[] {
  return MOCK_BILLS_DUE.map((bill) => ({ ...bill }));
}

export function createPaymentRunFromBills(
  bills: BillDueRow[],
  paymentMethod: PaymentMethod
): PaymentRunRow {
  const run: PaymentRunRow = {
    id: `pr-${Date.now()}`,
    number: `PR-${new Date().getFullYear()}-${String(listPaymentRuns().length + 1).padStart(3, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    status: "PENDING_APPROVAL",
    totalAmount: bills.reduce((sum, bill) => sum + bill.total, 0),
    currency: bills[0]?.currency ?? "KES",
    supplierCount: new Set(bills.map((bill) => bill.supplierId)).size,
    billCount: bills.length,
    paymentMethod,
  };
  appendStoredItem(RUNS_KEY, seedRuns, run, true);
  return run;
}

export function updatePaymentRunStatus(id: string, status: PaymentRunRow["status"]): PaymentRunRow | null {
  return updateStoredCollection(RUNS_KEY, seedRuns, id, (run) => ({ ...run, status }));
}

export function replacePaymentRuns(runs: PaymentRunRow[]): void {
  saveStoredValue(RUNS_KEY, runs);
}

