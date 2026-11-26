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
 * Joy Superbakers treats cash, cheque, and bank transfer as the same thing,
 * so those choices are not offered. M-Pesa is the only method and does not need a question.
 * Other companies are asked once per customer, then the saved method is used.
 */
export function invoicePaymentChoices(bakery: boolean): InvoicePaymentMethod[] {
  return bakery ? ["MPESA"] : [...INVOICE_PAYMENT_METHODS];
}

export function invoicePaymentMethodToApply(
  bakery: boolean,
  saved: string | null | undefined
): InvoicePaymentMethod | null {
  if (bakery) return "MPESA";
  return parseInvoicePaymentMethod(saved);
}
