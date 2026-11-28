import { describe, expect, it } from "vitest";
import { generalBatchTotals, likelyDuplicateGeneral, rememberedLedgerAccount, type GeneralBatchLine } from "./general-payment-batch";

const line = (patch: Partial<GeneralBatchLine>): GeneralBatchLine => ({
  key: "k1",
  clientRequestId: "r1",
  status: "ready",
  date: "2026-11-28",
  payeeName: "Shell Westlands",
  ledgerAccountId: "fuel",
  ledgerAccountLabel: "5100 Fuel",
  memo: "",
  amount: 1000,
  bankAccountId: "b1",
  bankAccountName: "Petty cash",
  method: "CASH",
  chequeNumber: "",
  chequeDate: "",
  mpesaTransactionNo: "",
  reference: "",
  ...patch,
});

const { key: _key, clientRequestId: _id, status: _status, ...draftOf } = line({});

describe("likelyDuplicateGeneral", () => {
  it("flags the same payee, amount, date and account", () => {
    expect(likelyDuplicateGeneral([line({})], draftOf)).toBeTruthy();
  });

  it("does not flag a different amount or a posted line", () => {
    expect(likelyDuplicateGeneral([line({ amount: 500 })], draftOf)).toBeUndefined();
    expect(likelyDuplicateGeneral([line({ status: "posted" })], draftOf)).toBeUndefined();
  });

  it("flags a repeated cheque number even for another payee", () => {
    const first = line({ method: "CHEQUE", chequeNumber: "000123", payeeName: "A", amount: 1 });
    const again = { ...draftOf, method: "CHEQUE" as const, chequeNumber: "000123", payeeName: "B", amount: 2 };
    expect(likelyDuplicateGeneral([first], again)).toBe(first);
  });
});

describe("rememberedLedgerAccount", () => {
  it("prefers this batch, then past payments, ignoring case", () => {
    expect(rememberedLedgerAccount("shell westlands", [line({ ledgerAccountId: "fuel" })], [])).toBe("fuel");
    expect(rememberedLedgerAccount(" KPLC ", [], [{ payeeName: "kplc", ledgerAccountId: "power" }])).toBe("power");
    expect(rememberedLedgerAccount("Unknown", [], [])).toBe("");
  });
});

describe("generalBatchTotals", () => {
  it("adds in cents", () => {
    expect(generalBatchTotals([line({ amount: 0.1 }), line({ amount: 0.2 })]).total).toBe(0.3);
  });
});
