export type OpenInvoiceRow = {
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
  currency?: string;
  exchangeRate?: number;
};

export type ArOpenItem = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  customerId: string;
  customerName: string;
  total: number;
  allocated: number;
  outstanding: number;
  status: string;
  currency?: string;
  sourceType: "invoice" | "credit-note";
};

export type CreditNoteApplicationLine = {
  creditNoteId: string;
  creditNoteNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  reason: string;
};

export type SettlementPreview = {
  creditNoteApplications: CreditNoteApplicationLine[];
  invoiceLines: Array<{
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    confidence: number;
    reason: string;
  }>;
  creditsApplied: number;
  cashApplied: number;
  unapplied: number;
  flags: Array<{ code: string; severity: string; message: string }>;
};

export type PaymentRow = {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: string;
  paymentMethod?: "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";
  mpesaTransactionNo?: string;
  reference?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankAccountId?: string;
  bankAccountName?: string;
  openAmount?: number;
  appliedAmount?: number;
  allocations?: Array<{
    documentType?: string;
    documentId: string;
    documentNumber?: string;
    amount: number;
  }>;
};
