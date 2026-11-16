import { apiRequest } from "@/lib/api/client";

export type ReceiptAllocation = { documentId: string; amount: number };
export type CreditAllocation = { creditNoteId: string; invoiceId: string; amount: number };
type OpenDocument = {
  id: string;
  number: string;
  type: string;
  outstanding: number;
  date: string;
  dueDate?: string;
  sourceInvoiceId?: string;
};
type AdviceFile = { fileId: string; fileName: string; contentType?: string };

export type ArReconciliation = {
  receipt: {
    id: string;
    number: string;
    amount: number;
    unapplied: number;
    currency: string;
    customerId: string;
    customerName: string;
    chequeNumber?: string;
    reference?: string;
    paymentMethod?: string;
    date: string;
  };
  invoices: OpenDocument[];
  credits: OpenDocument[];
  advice: (AdviceFile & {
    id: string;
    partyName?: string;
    paymentReference?: string;
    total?: number;
    remittanceLines: Array<{ invoiceNumber: string; paymentAmount: number; kind: string }>;
  }) | null;
  linkedAdvice: Array<AdviceFile & { _id: string }>;
  suggested: {
    allocations: ReceiptAllocation[];
    creditNoteApplications: CreditAllocation[];
    issues: string[];
  };
  snapshot: string;
  suggestionReason: string;
};

const endpoint = (paymentId: string) => `/api/ar/payments/${encodeURIComponent(paymentId)}/reconciliation`;

export function fetchArReconciliation(paymentId: string, adviceId?: string) {
  return apiRequest<ArReconciliation>(endpoint(paymentId) + (adviceId ? `?adviceId=${encodeURIComponent(adviceId)}` : ""));
}

export function confirmArReconciliation(paymentId: string, body: {
  adviceId?: string;
  snapshot: string;
  requestKey: string;
  acknowledgeIssues: boolean;
  allocations: ReceiptAllocation[];
  creditNoteApplications: CreditAllocation[];
}) {
  return apiRequest<{ paymentId: string; number: string }>(endpoint(paymentId), { method: "POST", body });
}
