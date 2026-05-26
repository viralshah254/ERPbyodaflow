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
  /** Sequential shipment cost code (SCOST0001, …). */
  costNumber?: string;
  costType?: string;
  costReference?: string;
  sourceGrnId?: string;
  sourceGrnNumber?: string;
  allocationId?: string;
  lineIndex?: number;
  costAttachments?: Array<{ id: string; fileName: string; contentType?: string }>;
  linkedBillId?: string;
  linkedBillNumber?: string;
  linkedShipmentCosts?: Array<{
    costNumber: string;
    costType: string;
    costReference?: string;
    amount: number;
    currency: string;
    billId?: string;
    billNumber?: string;
    billStatus?: string;
    allocationId: string;
    lineIndex: number;
    attachments?: Array<{ id: string; fileName: string; contentType?: string }>;
  }>;
  /** @deprecated Supplier bills no longer roll up landed costs; use individual cost bills. */
  landedAllocated?: number;
  landedBreakdown?: Array<{ label: string; amount: number }>;
  economicTotal?: number;
  grnNumber?: string;
};

export type APPaymentAllocation = {
  documentType: string;
  documentId: string;
  documentNumber?: string;
  amount: number;
};

export type APPaymentRow = {
  id: string;
  number: string;
  date: string;
  party: string;
  partyId?: string;
  amount: number;
  status: string;
  paymentMethod?: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";
  mpesaTransactionNo?: string;
  openAmount?: number;
  appliedAmount?: number;
  allocations?: APPaymentAllocation[];
};
