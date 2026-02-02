/**
 * Mock overdue invoices for /treasury/collections (AR collections).
 */

export interface OverdueInvoiceRow {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  total: number;
  outstanding: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
}

export const MOCK_OVERDUE_INVOICES: OverdueInvoiceRow[] = [
  { id: "1", number: "INV-089", customerId: "c1", customerName: "ABC Retail", total: 45000, outstanding: 45000, currency: "KES", dueDate: "2024-12-20", daysOverdue: 39 },
  { id: "2", number: "INV-095", customerId: "c2", customerName: "XYZ Shop", total: 22000, outstanding: 22000, currency: "KES", dueDate: "2025-01-05", daysOverdue: 23 },
];

export function getMockOverdueInvoices(): OverdueInvoiceRow[] {
  return [...MOCK_OVERDUE_INVOICES];
}
