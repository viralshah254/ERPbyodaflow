import { expect, it } from "vitest";
import {
  invoicePaymentChoices,
  invoicePaymentMethodToApply,
  parseInvoicePaymentMethod,
} from "./invoice-payment-method";

it("keeps cash, cheque, M-Pesa, and bank transfer for other companies", () => {
  expect(invoicePaymentChoices(false)).toEqual(["CASH", "CHEQUE", "MPESA", "BANK_TRANSFER"]);
  expect(invoicePaymentMethodToApply(false, "CHEQUE")).toBe("CHEQUE");
  expect(invoicePaymentMethodToApply(false, null)).toBeNull();
});

it("uses M-Pesa only for a bakery and does not keep cash, cheque, or bank transfer", () => {
  expect(invoicePaymentChoices(true)).toEqual(["MPESA"]);
  expect(invoicePaymentMethodToApply(true, "CHEQUE")).toBe("MPESA");
  expect(invoicePaymentMethodToApply(true, null)).toBe("MPESA");
});

it("ignores an unknown saved method", () => {
  expect(parseInvoicePaymentMethod("card")).toBeNull();
  expect(parseInvoicePaymentMethod(" mpesa ")).toBe("MPESA");
});
