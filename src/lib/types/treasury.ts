export type BankAccountRow = {
  id: string;
  name: string;
  accountNumber: string;
  bank: string;
  branch?: string;
  currency: string;
  glAccountId?: string;
  glAccountCode?: string;
  glAccountName?: string;
  active: boolean;
};

export type OverdueInvoiceRow = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  total: number;
  outstanding: number;
  currency: string;
  exchangeRate?: number;
  dueDate: string;
  daysOverdue: number;
};

export type PaymentMethod = "BANK_TRANSFER" | "M_PESA" | "CHEQUE";

export type BillDueRow = {
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
};

export type PaymentRunRow = {
  id: string;
  number: string;
  date: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PROCESSED";
  totalAmount: number;
  currency: string;
  supplierCount: number;
  billCount: number;
  paymentMethod: PaymentMethod;
};

export type CashflowForecastRow = {
  id: string;
  date: string;
  description: string;
  type: "receipt" | "payment" | "transfer" | "other";
  inflow: number;
  outflow: number;
  balance: number;
  currency: string;
  sourceDoc?: string;
};
