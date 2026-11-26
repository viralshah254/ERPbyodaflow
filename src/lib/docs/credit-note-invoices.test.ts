import { describe, expect, it } from "vitest";
import {
  creditExceedsInvoiceCover,
  creditInvoiceCover,
  creditInvoiceWindow,
  invoiceInsideCreditWindow,
} from "./credit-note-invoices";

describe("credit note invoice window", () => {
  it("includes the credit date and the 30 days before it", () => {
    expect(creditInvoiceWindow("2026-11-26")).toEqual({ from: "2026-10-27", to: "2026-11-26" });
    expect(invoiceInsideCreditWindow("2026-10-27", "2026-11-26")).toBe(true);
    expect(invoiceInsideCreditWindow("2026-10-26", "2026-11-26")).toBe(false);
    expect(invoiceInsideCreditWindow("2026-11-27", "2026-11-26")).toBe(false);
  });

  it("caps the goods at the uncovered invoice amount", () => {
    expect(creditInvoiceCover([{ remaining: 10000 }, { remaining: 2500.5 }])).toBe(12500.5);
    expect(creditExceedsInvoiceCover(12500.5, 12500.5)).toBe(false);
    expect(creditExceedsInvoiceCover(12500.52, 12500.5)).toBe(true);
  });
});