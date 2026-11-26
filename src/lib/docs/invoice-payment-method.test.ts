import { expect, it } from "vitest";
import {
  invoicePaymentChoiceLabel,
  invoicePaymentChoices,
  invoicePaymentMethodToApply,
  parseInvoicePaymentMethod,
} from "./invoice-payment-method";

it("keeps cash, cheque, M-Pesa, and bank transfer for other companies", () => {
  expect(invoicePaymentChoices(false)).toEqual(["CASH", "CHEQUE", "MPESA", "BANK_TRANSFER"]);
  expect(invoicePaymentMethodToApply(false, "CHEQUE")).toBe("CHEQUE");
  expect(invoicePaymentMethodToApply(false, null)).toBeNull();
});

it("offers M-Pesa and Bank for a bakery, and treats cheque as bank", () => {
  expect(invoicePaymentChoices(true)).toEqual(["MPESA", "BANK_TRANSFER"]);
  expect(invoicePaymentChoiceLabel("BANK_TRANSFER", true)).toBe("Bank");
  expect(invoicePaymentChoiceLabel("CHEQUE", true)).toBe("Bank");
  expect(invoicePaymentMethodToApply(true, "CHEQUE")).toBe("BANK_TRANSFER");
  expect(invoicePaymentMethodToApply(true, "BANK_TRANSFER")).toBe("BANK_TRANSFER");
  expect(invoicePaymentMethodToApply(true, "MPESA")).toBe("MPESA");
  expect(invoicePaymentMethodToApply(true, "CASH")).toBeNull();
  expect(invoicePaymentMethodToApply(true, null)).toBeNull();
});

it("ignores an unknown saved method", () => {
  expect(parseInvoicePaymentMethod("card")).toBeNull();
  expect(parseInvoicePaymentMethod(" mpesa ")).toBe("MPESA");
});
