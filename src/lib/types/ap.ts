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
  currency?: string;
  exchangeRate?: number;
  status: string;
  dueDate?: string;
  allocated?: number;
  outstanding?: number;
  poRef?: string;
  /** True when this bill was auto-created from a GRN cost line (Fuel, Transport, etc.). */
  isLandedCostBill?: boolean;
  costType?: string;
  costReference?: string;
  sourceGrnId?: string;
  sourceGrnNumber?: string;
  allocationId?: string;
  costAttachments?: Array<{ id: string; fileName: string; contentType?: string }>;
  /** @deprecated Supplier bills no longer roll up landed costs; use individual cost bills. */
  landedAllocated?: number;
  landedBreakdown?: Array<{ label: string; amount: number }>;
  economicTotal?: number;
  grnNumber?: string;
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
