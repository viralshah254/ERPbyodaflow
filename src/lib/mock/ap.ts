/**
 * Mock AP data: suppliers, bills, payments.
 */

export interface APSupplierRow {
  id: string;
  name: string;
  email?: string;
  paymentTerms?: string;
  status: string;
}

export interface APBillRow {
  id: string;
  number: string;
  date: string;
  party: string;
  total: number;
  status: string;
  dueDate?: string;
}

export interface APPaymentRow {
  id: string;
  number: string;
  date: string;
  party: string;
  amount: number;
  status: string;
}

export const MOCK_AP_SUPPLIERS: APSupplierRow[] = [
  { id: "s1", name: "Supplier A", email: "a@supplier.com", paymentTerms: "Net 30", status: "ACTIVE" },
  { id: "s2", name: "Supplier B", email: "b@supplier.com", paymentTerms: "Net 14", status: "ACTIVE" },
];

export const MOCK_AP_BILLS: APBillRow[] = [
  { id: "1", number: "BILL-1", date: "2025-01-10", party: "Supplier A", total: 250000, status: "POSTED", dueDate: "2025-02-09" },
  { id: "2", number: "BILL-2", date: "2025-01-12", party: "Supplier B", total: 185000, status: "DRAFT", dueDate: "2025-02-11" },
];

export const MOCK_AP_PAYMENTS: APPaymentRow[] = [
  { id: "1", number: "PAY-AP-001", date: "2025-01-20", party: "Supplier A", amount: 100000, status: "POSTED" },
];

export function getMockAPSuppliers(): APSupplierRow[] {
  return [...MOCK_AP_SUPPLIERS];
}

export function getMockAPBills(): APBillRow[] {
  return [...MOCK_AP_BILLS];
}

export function getMockAPPayments(): APPaymentRow[] {
  return [...MOCK_AP_PAYMENTS];
}
