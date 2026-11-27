import type { ArOpenItem, CreditNoteApplicationLine } from "@/lib/types/ar";
import { roundMoney, sumAmounts } from "@/lib/ar/settlement-edit";

/** AR: money in from customers against invoices. AP: money out to suppliers against bills. */
export type SettlementSide = "AR" | "AP";

export type PaymentMethod = "BANK_TRANSFER" | "CHEQUE" | "CASH" | "MPESA";

export const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CASH", label: "Cash" },
  { value: "MPESA", label: "M-Pesa" },
];

export function methodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((row) => row.value === method)?.label ?? method;
}

export function needsBankAccount(method: PaymentMethod): boolean {
  return method === "BANK_TRANSFER" || method === "CHEQUE";
}

export type PlannedAllocation = {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  /** True when the clerk chose this document; false when it came from soonest-due-first. */
  tied: boolean;
};

export type BatchLineStatus = "ready" | "posting" | "posted" | "failed";

export type BatchLine = {
  key: string;
  clientRequestId: string;
  partyId: string;
  partyName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  bankAccountId: string;
  bankAccountName: string;
  reference: string;
  chequeNumber: string;
  chequeDate: string;
  mpesaTransactionNo: string;
  allocations: PlannedAllocation[];
  creditApplications: CreditNoteApplicationLine[];
  /** Not on any invoice or bill: stays on the party's account. */
  unapplied: number;
  status: BatchLineStatus;
  paymentId?: string;
  paymentNumber?: string;
  error?: string;
};

export type BatchClaims = {
  invoices: Record<string, number>;
  creditNotes: Record<string, number>;
};

/** What other unposted lines for this party already take from each document and credit note. */
export function batchClaims(lines: BatchLine[], partyId: string, exceptKey?: string): BatchClaims {
  const invoices: Record<string, number> = {};
  const creditNotes: Record<string, number> = {};
  for (const line of lines) {
    if (line.key === exceptKey || line.partyId !== partyId || line.status === "posted") continue;
    for (const row of line.allocations) {
      invoices[row.invoiceId] = roundMoney((invoices[row.invoiceId] ?? 0) + row.amount);
    }
    for (const row of line.creditApplications) {
      invoices[row.invoiceId] = roundMoney((invoices[row.invoiceId] ?? 0) + row.amount);
      creditNotes[row.creditNoteId] = roundMoney((creditNotes[row.creditNoteId] ?? 0) + row.amount);
    }
  }
  return { invoices, creditNotes };
}

/** Open items less what the batch already claims. Items with nothing left drop out. */
export function withoutClaims(items: ArOpenItem[], claimed: Record<string, number>): ArOpenItem[] {
  return items.flatMap((item) => {
    const outstanding = roundMoney(item.outstanding - (claimed[item.id] ?? 0));
    return outstanding > 0.009 ? [{ ...item, outstanding }] : [];
  });
}

/** Soonest due first, then oldest, then number. */
export function sortByDue(items: ArOpenItem[]): ArOpenItem[] {
  const key = (item: ArOpenItem) => item.dueDate || item.date || "9999-12-31";
  return [...items].sort(
    (a, b) => key(a).localeCompare(key(b)) || (a.date || "").localeCompare(b.date || "") || a.number.localeCompare(b.number),
  );
}

/** Keep credit lines inside what each credit note and document still has open. */
export function clampCreditApplications(
  applications: CreditNoteApplicationLine[],
  invoices: ArOpenItem[],
  creditNotes: ArOpenItem[],
): CreditNoteApplicationLine[] {
  const invoiceRoom = new Map(invoices.map((row) => [row.id, row.outstanding]));
  const creditRoom = new Map(creditNotes.map((row) => [row.id, row.outstanding]));
  return applications.flatMap((line) => {
    const amount = roundMoney(
      Math.min(line.amount, invoiceRoom.get(line.invoiceId) ?? 0, creditRoom.get(line.creditNoteId) ?? 0),
    );
    if (amount <= 0.009) return [];
    invoiceRoom.set(line.invoiceId, roundMoney((invoiceRoom.get(line.invoiceId) ?? 0) - amount));
    creditRoom.set(line.creditNoteId, roundMoney((creditRoom.get(line.creditNoteId) ?? 0) - amount));
    return [{ ...line, amount }];
  });
}

/**
 * Chosen amounts land first. With spreadRemainder, whatever is left pays open documents in list order
 * until it runs out; without it, the rest stays on the party's account.
 */
export function planSettlement(input: {
  amount: number;
  invoices: ArOpenItem[];
  tied: Record<string, number>;
  credits: CreditNoteApplicationLine[];
  spreadRemainder: boolean;
}): { allocations: PlannedAllocation[]; tiedTotal: number; spread: number; unapplied: number } {
  const creditOn = new Map<string, number>();
  for (const line of input.credits) {
    creditOn.set(line.invoiceId, roundMoney((creditOn.get(line.invoiceId) ?? 0) + line.amount));
  }
  const tiedTotal = sumAmounts(input.invoices.map((invoice) => Math.max(input.tied[invoice.id] ?? 0, 0)));
  let left = roundMoney(Math.max(input.amount - tiedTotal, 0));
  const allocations: PlannedAllocation[] = [];
  for (const invoice of input.invoices) {
    const tied = roundMoney(Math.max(input.tied[invoice.id] ?? 0, 0));
    if (tied > 0) allocations.push({ invoiceId: invoice.id, invoiceNumber: invoice.number, amount: tied, tied: true });
  }
  let spread = 0;
  for (const invoice of input.spreadRemainder ? input.invoices : []) {
    if (left <= 0.009) break;
    const room = roundMoney(invoice.outstanding - (creditOn.get(invoice.id) ?? 0) - Math.max(input.tied[invoice.id] ?? 0, 0));
    if (room <= 0.009) continue;
    const take = roundMoney(Math.min(room, left));
    allocations.push({ invoiceId: invoice.id, invoiceNumber: invoice.number, amount: take, tied: false });
    left = roundMoney(left - take);
    spread = roundMoney(spread + take);
  }
  return { allocations, tiedTotal, spread, unapplied: left };
}

/** Problem with the chosen amounts, or null when the plan can post. */
export function tiedProblem(input: {
  amount: number;
  invoices: ArOpenItem[];
  tied: Record<string, number>;
  credits: CreditNoteApplicationLine[];
}): string | null {
  const tiedTotal = sumAmounts(Object.values(input.tied).map((value) => Math.max(value, 0)));
  if (tiedTotal > input.amount + 0.009) return "The amounts you chose add up to more than the payment.";
  for (const invoice of input.invoices) {
    const tied = input.tied[invoice.id] ?? 0;
    if (tied < 0) return `${invoice.number} cannot take a negative amount.`;
    const credit = sumAmounts(input.credits.filter((line) => line.invoiceId === invoice.id).map((line) => line.amount));
    if (tied + credit > invoice.outstanding + 0.009) {
      return `${invoice.number} only has ${invoice.outstanding.toLocaleString("en-KE", { minimumFractionDigits: 2 })} open.`;
    }
  }
  return null;
}

/** Document numbers mentioned in a narration, e.g. "INV-0042, inv 43". */
export function documentsNamedIn(reference: string, invoices: ArOpenItem[]): ArOpenItem[] {
  const text = reference.toUpperCase();
  if (!text.trim()) return [];
  return invoices.filter((invoice) => {
    const parts = invoice.number.toUpperCase().split(/[\s\-_/]+/).filter(Boolean);
    if (parts.join("").length < 3) return false;
    const escaped = parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`(?<![A-Z0-9])${escaped.join("[\\s\\-_/]*")}(?![A-Z0-9])`).test(text);
  });
}

/** Another unposted line that looks like the same money keyed twice. */
export function likelyDuplicate(
  lines: BatchLine[],
  draft: Pick<BatchLine, "partyId" | "amount" | "method" | "reference" | "chequeNumber" | "mpesaTransactionNo">,
  exceptKey?: string,
): BatchLine | undefined {
  const ref = (value: string) => value.trim().toUpperCase();
  return lines.find((line) => {
    if (line.key === exceptKey || line.status === "posted") return false;
    if (draft.method === "CHEQUE" && draft.chequeNumber && line.method === "CHEQUE" && ref(line.chequeNumber) === ref(draft.chequeNumber)) return true;
    if (draft.method === "MPESA" && draft.mpesaTransactionNo && ref(line.mpesaTransactionNo) === ref(draft.mpesaTransactionNo)) return true;
    return line.partyId === draft.partyId && Math.abs(line.amount - draft.amount) < 0.01 && ref(line.reference) === ref(draft.reference);
  });
}

export function batchTotals(lines: BatchLine[]): {
  count: number;
  total: number;
  byMethod: Array<{ method: PaymentMethod; count: number; total: number }>;
} {
  const byMethod = new Map<PaymentMethod, { count: number; total: number }>();
  for (const line of lines) {
    const row = byMethod.get(line.method) ?? { count: 0, total: 0 };
    row.count += 1;
    row.total = roundMoney(row.total + line.amount);
    byMethod.set(line.method, row);
  }
  return {
    count: lines.length,
    total: sumAmounts(lines.map((line) => line.amount)),
    byMethod: PAYMENT_METHODS.flatMap(({ value }) => {
      const row = byMethod.get(value);
      return row ? [{ method: value, ...row }] : [];
    }),
  };
}
