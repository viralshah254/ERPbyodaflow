import { apiRequest, uploadFile } from "./client";

export const STATEMENT_PAGE_SIZE = 30;
export type StatementChannel = "BANK" | "MPESA";
export type StatementLine = {
  _id: string; reference?: string; description?: string; amount: number; statementDate: string;
  status: "PENDING" | "MATCHED"; eligible: boolean; tillNumber?: string;
};
export type StatementPreview = { rows: number; customerLines: number; otherLines: number; firstDate: string; lastDate: string };
export type StatementInvoice = { sourceId: string; sourceNumber?: string; sourceDate: string; openAmount: number };
export type StatementCandidate = {
  candidateType: "invoice" | "payment"; candidateId: string; candidateNumber?: string;
  partyId?: string; partyName?: string; openAmount: number; signals: Array<{ code: string; label: string }>;
};
type StatementAllocation = { documentId: string; amount: number };
export type StatementDetail = {
  line: StatementLine; eligible: boolean; mpesa: boolean; receiptNumber?: string; tillNumber?: string;
  route: { loadNoteId: string; partyId: string; partyName: string; invoiceHint?: string; conflict?: string } | null;
  suggestions: StatementCandidate[];
  proposals: Array<{ _id: string; status: "SUGGESTED" | "APPROVED"; rationale?: string; suggestedBy: string;
    approvedBy?: string; allocations: Array<StatementAllocation & { number?: string }> }>;
};

const base = "/api/ar/statement-review";
export const listArStatementLines = (params: Record<string, string>) =>
  apiRequest<{ items: StatementLine[]; hasMore: boolean; currency: string }>(base, { params });
export const getArStatementDetail = (id: string) => apiRequest<StatementDetail>(`${base}/${encodeURIComponent(id)}`);
export const listArStatementInvoices = (id: string, params: Record<string, string>) =>
  apiRequest<{ items: StatementInvoice[]; hasMore: boolean }>(`${base}/${encodeURIComponent(id)}/invoices`, { params });
export const confirmArStatement = (id: string, body: {
  paymentId?: string; partyId?: string; reviewNote?: string; keepOnAccount?: boolean; allocations?: StatementAllocation[];
}) => apiRequest<{ paymentId?: string; proposalId?: string; status: string }>(`${base}/${encodeURIComponent(id)}/confirm`, { method: "POST", body });

export function uploadArStatement(file: File, accountId: string, channel: StatementChannel, preview: boolean) {
  return new Promise<{ preview?: StatementPreview; imported?: number; duplicates?: number; batchId?: string }>((resolve, reject) => {
    void uploadFile("/api/import/bank-statement", file, resolve, (message) => reject(new Error(message)), {
      bankAccountId: accountId, reviewChannel: channel, preview: String(preview),
    });
  });
}
