import type { ArOpenItem, CreditNoteApplicationLine, SettlementPreview } from "@/lib/types/ar";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sumAmounts(values: number[]): number {
  return roundMoney(values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0));
}

export function creditUsed(applications: CreditNoteApplicationLine[], creditNoteId: string): number {
  return sumAmounts(applications.filter((line) => line.creditNoteId === creditNoteId).map((line) => line.amount));
}

export function creditsOnInvoice(applications: CreditNoteApplicationLine[], invoiceId: string): number {
  return sumAmounts(applications.filter((line) => line.invoiceId === invoiceId).map((line) => line.amount));
}

export function scaleCreditNote(
  applications: CreditNoteApplicationLine[],
  creditNoteId: string,
  nextTotal: number
): CreditNoteApplicationLine[] {
  const cap = roundMoney(Math.max(nextTotal, 0));
  let remaining = cap;
  return applications.flatMap((line) => {
    if (line.creditNoteId !== creditNoteId) return [line];
    const amount = roundMoney(Math.min(line.amount, remaining));
    remaining = roundMoney(remaining - amount);
    if (amount <= 0) return [];
    return [{ ...line, amount }];
  });
}

export function applyPreview(preview: SettlementPreview): {
  invoiceAmounts: Record<string, number>;
  creditApplications: CreditNoteApplicationLine[];
} {
  const invoiceAmounts: Record<string, number> = {};
  for (const line of preview.invoiceLines) {
    invoiceAmounts[line.invoiceId] = roundMoney((invoiceAmounts[line.invoiceId] ?? 0) + line.amount);
  }
  return {
    invoiceAmounts,
    creditApplications: preview.creditNoteApplications.map((line) => ({ ...line, amount: roundMoney(line.amount) })),
  };
}

export function settlementProblem(input: {
  amount: number;
  invoices: ArOpenItem[];
  creditNotes: ArOpenItem[];
  invoiceAmounts: Record<string, number>;
  creditApplications: CreditNoteApplicationLine[];
}): string | null {
  const cash = sumAmounts(Object.values(input.invoiceAmounts));
  if (cash > input.amount + 0.009) return "Cash applied is more than the amount received.";
  for (const invoice of input.invoices) {
    const applied = roundMoney((input.invoiceAmounts[invoice.id] ?? 0) + creditsOnInvoice(input.creditApplications, invoice.id));
    if ((input.invoiceAmounts[invoice.id] ?? 0) < 0) return `${invoice.number} cannot take a negative amount.`;
    if (applied > invoice.outstanding + 0.009) {
      return `${invoice.number} is only open for ${invoice.outstanding}.`;
    }
  }
  for (const credit of input.creditNotes) {
    const used = creditUsed(input.creditApplications, credit.id);
    if (used > credit.outstanding + 0.009) {
      return `${credit.number} is only open for ${credit.outstanding}.`;
    }
  }
  return null;
}

export function explainSettlement(preview: SettlementPreview | null, currencyLabel: string): string {
  if (!preview) return "There is no suggested match yet. Enter the customer and the amount received.";
  const creditLines = preview.creditNoteApplications
    .map((line) => `${line.creditNoteNumber} covers ${currencyLabel} ${line.amount.toFixed(2)} of ${line.invoiceNumber}`)
    .join("; ");
  const cashLines = preview.invoiceLines
    .map((line) => `${line.invoiceNumber} takes ${currencyLabel} ${line.amount.toFixed(2)} (${line.reason})`)
    .join("; ");
  const unapplied =
    preview.unapplied > 0.009
      ? `${currencyLabel} ${preview.unapplied.toFixed(2)} stays unapplied on the customer.`
      : "The receipt is fully applied.";
  return [
    "Explain this accounts-receivable match in plain language for the clerk. Do not post or change anything.",
    creditLines ? `Credit notes: ${creditLines}.` : "No credit notes are suggested.",
    cashLines ? `Cash: ${cashLines}.` : "No invoice is suggested for the cash.",
    unapplied,
  ].join(" ");
}
