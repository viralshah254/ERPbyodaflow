/**
 * Mock AR data: customers (with AR fields), open invoices, payments.
 */

export interface ARCustomerRow {
  id: string;
  name: string;
  email?: string;
  creditLimit?: number;
  paymentTerms?: string;
  currencyPreference?: string;
  taxPin?: string;
  status: string;
}

export interface OpenInvoiceRow {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  total: number;
  allocated: number;
  outstanding: number;
  dueDate: string;
  status: string;
}

export interface PaymentRow {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: string;
}

export const MOCK_AR_CUSTOMERS: ARCustomerRow[] = [
  {
    id: "c1",
    name: "ABC Retail",
    email: "abc@retail.com",
    creditLimit: 500000,
    paymentTerms: "Net 30",
    currencyPreference: "KES",
    status: "ACTIVE",
  },
  {
    id: "c2",
    name: "XYZ Shop",
    email: "xyz@shop.com",
    creditLimit: 200000,
    paymentTerms: "Net 14",
    status: "ACTIVE",
  },
];

export const MOCK_OPEN_INVOICES: OpenInvoiceRow[] = [
  {
    id: "1",
    number: "INV-1",
    date: "2025-01-10",
    customerId: "c1",
    customerName: "ABC Retail",
    total: 125000,
    allocated: 0,
    outstanding: 125000,
    dueDate: "2025-02-09",
    status: "OPEN",
  },
  {
    id: "2",
    number: "INV-2",
    date: "2025-01-12",
    customerId: "c2",
    customerName: "XYZ Shop",
    total: 85050,
    allocated: 20000,
    outstanding: 65050,
    dueDate: "2025-01-26",
    status: "OPEN",
  },
];

export const MOCK_PAYMENTS: PaymentRow[] = [
  {
    id: "1",
    number: "PAY-001",
    date: "2025-01-20",
    customerId: "c2",
    customerName: "XYZ Shop",
    amount: 20000,
    status: "POSTED",
  },
];

export function getMockARCustomers(): ARCustomerRow[] {
  return [...MOCK_AR_CUSTOMERS];
}

export function getMockOpenInvoices(customerId?: string): OpenInvoiceRow[] {
  let out = [...MOCK_OPEN_INVOICES];
  if (customerId) out = out.filter((i) => i.customerId === customerId);
  return out;
}

export function getMockPayments(): PaymentRow[] {
  return [...MOCK_PAYMENTS];
}
