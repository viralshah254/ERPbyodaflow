/**
 * Mock data for /treasury/payment-runs (AP payment runs).
 */

export type PaymentMethod = "BANK_TRANSFER" | "M_PESA" | "CHEQUE";

export interface BillDueRow {
  id: string;
  billId: string;
  number: string;
  date: string;
  supplierId: string;
  supplier: string;
  total: number;
  currency: string;
  dueDate: string;
  selected?: boolean;
}

export interface PaymentRunRow {
  id: string;
  number: string;
  date: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PROCESSED";
  totalAmount: number;
  currency: string;
  supplierCount: number;
  billCount: number;
  paymentMethod: PaymentMethod;
}

export const MOCK_BILLS_DUE: BillDueRow[] = [
  { id: "b1", billId: "1", number: "BILL-1", date: "2025-01-10", supplierId: "s1", supplier: "Supplier A", total: 250000, currency: "KES", dueDate: "2025-02-09" },
  { id: "b2", billId: "2", number: "BILL-2", date: "2025-01-12", supplierId: "s2", supplier: "Supplier B", total: 185000, currency: "KES", dueDate: "2025-02-11" },
  { id: "b3", billId: "3", number: "BILL-3", date: "2025-01-15", supplierId: "s1", supplier: "Supplier A", total: 75000, currency: "KES", dueDate: "2025-02-14" },
];

export const MOCK_PAYMENT_RUNS: PaymentRunRow[] = [
  {
    id: "pr1",
    number: "PR-2025-001",
    date: "2025-01-25",
    status: "APPROVED",
    totalAmount: 350000,
    currency: "KES",
    supplierCount: 2,
    billCount: 3,
    paymentMethod: "BANK_TRANSFER",
  },
  {
    id: "pr2",
    number: "PR-2025-002",
    date: "2025-01-28",
    status: "DRAFT",
    totalAmount: 125000,
    currency: "KES",
    supplierCount: 1,
    billCount: 1,
    paymentMethod: "M_PESA",
  },
];

const RUNS_STORAGE_KEY = "odaflow_mock_payment_runs";

function cloneRuns(runs: PaymentRunRow[]): PaymentRunRow[] {
  return runs.map((run) => ({ ...run }));
}

export function getMockBillsDue(): BillDueRow[] {
  return [...MOCK_BILLS_DUE];
}

export function getMockPaymentRuns(): PaymentRunRow[] {
  if (typeof window === "undefined") return cloneRuns(MOCK_PAYMENT_RUNS);
  try {
    const raw = localStorage.getItem(RUNS_STORAGE_KEY);
    if (!raw) return cloneRuns(MOCK_PAYMENT_RUNS);
    return cloneRuns(JSON.parse(raw) as PaymentRunRow[]);
  } catch {
    return cloneRuns(MOCK_PAYMENT_RUNS);
  }
}

function savePaymentRuns(runs: PaymentRunRow[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify(runs));
}

export function updateMockPaymentRunStatus(id: string, status: PaymentRunRow["status"]): void {
  const next = getMockPaymentRuns().map((run) =>
    run.id === id ? { ...run, status } : run
  );
  savePaymentRuns(next);
}
