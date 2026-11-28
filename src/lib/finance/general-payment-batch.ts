import type { GeneralPaymentMethod, GeneralPaymentRow } from "@/lib/api/payments";

export type GeneralBatchLine = {
  key: string;
  clientRequestId: string;
  status: "ready" | "posting" | "posted" | "failed";
  date: string;
  payeeName: string;
  ledgerAccountId: string;
  ledgerAccountLabel: string;
  memo: string;
  amount: number;
  bankAccountId: string;
  bankAccountName: string;
  method: GeneralPaymentMethod;
  chequeNumber: string;
  chequeDate: string;
  mpesaTransactionNo: string;
  reference: string;
  paymentId?: string;
  paymentNumber?: string;
  error?: string;
  errorTitle?: string;
  /** Where the failure can be fixed, when a screen exists for it. */
  errorHref?: string;
  errorLabel?: string;
};

export type GeneralBatchDraft = Omit<GeneralBatchLine, "key" | "clientRequestId" | "status">;

const norm = (value: string) => value.trim().toLowerCase();

/** The instrument code (cheque number, M-Pesa code, or free reference) shown for a line. */
export function instrumentCode(line: Pick<GeneralBatchLine, "method" | "chequeNumber" | "mpesaTransactionNo" | "reference">): string {
  if (line.method === "CHEQUE") return line.chequeNumber;
  if (line.method === "MPESA") return line.mpesaTransactionNo;
  return line.reference;
}

/** A line already waiting in the batch that looks like the one being added. */
export function likelyDuplicateGeneral(lines: GeneralBatchLine[], draft: GeneralBatchDraft, exceptKey?: string): GeneralBatchLine | undefined {
  const code = norm(instrumentCode(draft));
  return lines.find((line) => {
    if (line.key === exceptKey || line.status === "posted") return false;
    if (code && line.method === draft.method && norm(instrumentCode(line)) === code) {
      return draft.method === "CHEQUE" || draft.method === "MPESA" ? true : norm(line.payeeName) === norm(draft.payeeName) && line.amount === draft.amount;
    }
    return (
      norm(line.payeeName) === norm(draft.payeeName) &&
      line.amount === draft.amount &&
      line.date === draft.date &&
      line.ledgerAccountId === draft.ledgerAccountId
    );
  });
}

/** The account this payee was last paid for, so a regular payee needs no account hunting. */
export function rememberedLedgerAccount(
  payeeName: string,
  lines: Array<Pick<GeneralBatchLine, "payeeName" | "ledgerAccountId">>,
  rows: Array<Pick<GeneralPaymentRow, "payeeName" | "ledgerAccountId">>,
): string {
  const name = norm(payeeName);
  if (!name) return "";
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]!;
    if (norm(line.payeeName) === name && line.ledgerAccountId) return line.ledgerAccountId;
  }
  const previous = rows.find((row) => norm(row.payeeName ?? "") === name && row.ledgerAccountId);
  return previous?.ledgerAccountId ?? "";
}

export function generalBatchTotals(lines: GeneralBatchLine[]): { count: number; total: number } {
  const cents = lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0);
  return { count: lines.length, total: cents / 100 };
}
