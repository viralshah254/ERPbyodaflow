import { describe, expect, it } from "vitest";
import { groupReceiptMoney, parseReceiptMoney } from "./receipt-money";

describe("parseReceiptMoney", () => {
  it("reads a grouped amount while the commas are only partly in place", () => {
    expect(parseReceiptMoney("50009988,000.00")).toBe(50009988000);
    expect(parseReceiptMoney("50,009,988,000.00")).toBe(50009988000);
    expect(parseReceiptMoney(groupReceiptMoney("560000"))).toBe(560000);
  });
});
