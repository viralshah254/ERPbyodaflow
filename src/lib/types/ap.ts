export type APSupplierRow = {
  id: string;
  name: string;
  email?: string;
  paymentTerms?: string;
  status: string;
};

export type APBillRow = {
  id: string;
  number: string;
  date: string;
  party: string;
  total: number;
  /** Sum of linked GRN landed-cost lines in base currency (KES). */
  landedAllocated?: number;
  landedBreakdown?: Array<{ label: string; amount: number }>;
  economicTotal?: number;
  currency?: string;
  exchangeRate?: number;
  status: string;
  dueDate?: string;
};

export type APPaymentRow = {
  id: string;
  number: string;
  date: string;
  party: string;
  amount: number;
  status: string;
  paymentMethod?: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";
  mpesaTransactionNo?: string;
};
