import { apiRequest } from "@/lib/api/client";
import type { ArReconciliation, CreditAllocation, ReceiptAllocation } from "@/lib/api/ar-reconciliation";

export type BatchCheque = { key: string } & (
  { paymentId: string } |
  { bankAccountId: string; chequeNumber: string; amount: number; chequeDate: string }
);

export type ChequeBatchInput = {
  partyId: string;
  currency: string;
  adviceId: string;
  postingDate: string;
  cheques: BatchCheque[];
};

export type ChequeAllocation = ReceiptAllocation & { chequeKey: string };
export type ChequeBatchPreview = {
  snapshot: string;
  chequeRows: Array<{
    key: string;
    paymentId?: string;
    receiptNumber?: string;
    chequeNumber?: string;
    amount: number;
    available: number;
  }>;
  invoices: ArReconciliation["invoices"];
  credits: ArReconciliation["credits"];
  advice: Omit<NonNullable<ArReconciliation["advice"]>, "remittanceLines"> & {
    remittanceLines: Array<{ chequeNumber?: string; invoiceNumber: string; kind: string; paymentAmount: number }>;
  };
  suggested: {
    targets: ReceiptAllocation[];
    allocations: ChequeAllocation[];
    creditNoteApplications: CreditAllocation[];
    issues: string[];
  };
};

const endpoint = "/api/ar/cheque-reconciliation";

export function fetchArCheques(partyId: string, currency: string, search: string) {
  return apiRequest<{ receipts: Array<{ id: string; number: string; chequeNumber?: string; amount: number; available: number }> }>(
    `${endpoint}/receipts?${new URLSearchParams({ partyId, currency, search })}`
  );
}

export function previewArChequeBatch(body: ChequeBatchInput) {
  return apiRequest<ChequeBatchPreview>(`${endpoint}/preview`, { method: "POST", body });
}

export function confirmArChequeBatch(body: ChequeBatchInput & {
  snapshot: string;
  requestKey: string;
  acknowledgeIssues: boolean;
  allocations: ChequeAllocation[];
  creditNoteApplications: CreditAllocation[];
}) {
  return apiRequest<{ receipts: Array<{ id: string; number: string }> }>(`${endpoint}/confirm`, {
    method: "POST", body,
  });
}
