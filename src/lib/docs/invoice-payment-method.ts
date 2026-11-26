export const INVOICE_PAYMENT_METHODS = ["CASH", "CHEQUE", "MPESA", "BANK_TRANSFER"] as const;

export type InvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number];

export const INVOICE_PAYMENT_LABELS: Record<InvoicePaymentMethod, string> = {
  CASH: "Cash",
  CHEQUE: "Cheque",
  MPESA: "M-Pesa",
  BANK_TRANSFER: "Bank transfer",
};

export function parseInvoicePaymentMethod(value: string | null | undefined): InvoicePaymentMethod | null {
  const method = String(value ?? "").trim().toUpperCase();
  return INVOICE_PAYMENT_METHODS.includes(method as InvoicePaymentMethod)
    ? (method as InvoicePaymentMethod)
    : null;
}

/**
 * A bakery offers M-Pesa and Bank. Cheque and bank transfer are the same Bank choice.
 * Cash is not offered. Other companies keep the four methods.
 * A saved method is used on the next invoice so the question is not asked again.
 */
export function invoicePaymentChoices(bakery: boolean): InvoicePaymentMethod[] {
  return bakery ? ["MPESA", "BANK_TRANSFER"] : [...INVOICE_PAYMENT_METHODS];
}

export function invoicePaymentChoiceLabel(method: InvoicePaymentMethod, bakery: boolean): string {
  if (bakery && (method === "BANK_TRANSFER" || method === "CHEQUE")) return "Bank";
  return INVOICE_PAYMENT_LABELS[method];
}

export function invoicePaymentMethodToApply(
  bakery: boolean,
  saved: string | null | undefined
): InvoicePaymentMethod | null {
  const parsed = parseInvoicePaymentMethod(saved);
  if (!bakery) return parsed;
  if (parsed === "MPESA") return "MPESA";
  if (parsed === "CHEQUE" || parsed === "BANK_TRANSFER") return "BANK_TRANSFER";
  return null;
}

export function invoicePaymentAlreadyRecorded(
  bakery: boolean,
  recorded: string | null | undefined
): boolean {
  return invoicePaymentMethodToApply(bakery, recorded) !== null;
}
