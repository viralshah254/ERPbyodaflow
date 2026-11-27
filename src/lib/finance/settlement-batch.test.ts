import { describe, expect, it } from "vitest";
import type { ArOpenItem } from "@/lib/types/ar";
import {
  batchClaims,
  documentsNamedIn,
  planSettlement,
  postingGroups,
  suggestLine,
  sortByDue,
  tiedProblem,
  withoutClaims,
  type BatchLine,
} from "./settlement-batch";

const invoice = (id: string, outstanding: number, dueDate?: string): ArOpenItem => ({
  id,
  number: `INV-${id}`,
  date: "2026-11-01",
  dueDate,
  customerId: "c1",
  customerName: "Shop",
  total: outstanding,
  allocated: 0,
  outstanding,
  status: "OPEN",
  sourceType: "invoice",
});

const line = (patch: Partial<BatchLine>): BatchLine => ({
  key: "k1",
  clientRequestId: "r1",
  partyId: "c1",
  partyName: "Shop",
  amount: 0,
  date: "2026-11-27",
  method: "BANK_TRANSFER",
  bankAccountId: "b1",
  bankAccountName: "KCB",
  reference: "",
  chequeNumber: "",
  chequeDate: "",
  mpesaTransactionNo: "",
  allocations: [],
  creditApplications: [],
  unapplied: 0,
  status: "ready",
  ...patch,
});

describe("planSettlement", () => {
  const invoices = [invoice("A", 30000), invoice("B", 50000), invoice("C", 20000)];

  it("suggests soonest due first until the money runs out", () => {
    const plan = planSettlement({ amount: 50000, invoices, tied: {}, credits: [], spreadRemainder: true });
    expect(plan.allocations).toEqual([
      { invoiceId: "A", invoiceNumber: "INV-A", amount: 30000, tied: false },
      { invoiceId: "B", invoiceNumber: "INV-B", amount: 20000, tied: false },
    ]);
    expect(plan.unapplied).toBe(0);
  });

  it("puts chosen money on the chosen document first and spreads the rest", () => {
    const plan = planSettlement({ amount: 60000, invoices, tied: { B: 50000 }, credits: [], spreadRemainder: true });
    expect(plan.allocations).toEqual([
      { invoiceId: "B", invoiceNumber: "INV-B", amount: 50000, tied: true },
      { invoiceId: "A", invoiceNumber: "INV-A", amount: 10000, tied: false },
    ]);
  });

  it("keeps the rest on account when it should not spread", () => {
    const plan = planSettlement({ amount: 60000, invoices, tied: { B: 50000 }, credits: [], spreadRemainder: false });
    expect(plan.allocations).toEqual([{ invoiceId: "B", invoiceNumber: "INV-B", amount: 50000, tied: true }]);
    expect(plan.unapplied).toBe(10000);
  });

  it("leaves money on account once every document is cleared", () => {
    expect(planSettlement({ amount: 120000, invoices, tied: {}, credits: [], spreadRemainder: true }).unapplied).toBe(20000);
  });

  it("flags chosen money above the document or the payment", () => {
    expect(tiedProblem({ amount: 40000, invoices, tied: { B: 50000 }, credits: [] })).toMatch(/more than the payment/);
    expect(tiedProblem({ amount: 90000, invoices, tied: { A: 31000 }, credits: [] })).toMatch(/INV-A/);
  });
});

describe("batch claims", () => {
  it("hides what earlier lines already pay from the next payment for the same party", () => {
    const first = line({ allocations: [{ invoiceId: "A", invoiceNumber: "INV-A", amount: 30000, tied: false }] });
    const left = withoutClaims([invoice("A", 30000), invoice("B", 50000)], batchClaims([first], "c1").invoices);
    expect(left.map((row) => row.id)).toEqual(["B"]);
    expect(batchClaims([first], "c1", "k1").invoices).toEqual({});
  });
});

describe("sortByDue", () => {
  it("puts the soonest due first", () => {
    const rows = sortByDue([invoice("A", 1, "2026-12-30"), invoice("B", 1, "2026-11-30"), invoice("C", 1)]);
    expect(rows.map((row) => row.id)).toEqual(["C", "B", "A"]);
  });
});

describe("documentsNamedIn", () => {
  it("finds document numbers in a bank narration", () => {
    const found = documentsNamedIn("payment for inv-b and INV C", [invoice("A", 1), invoice("B", 1), invoice("C", 1)]);
    expect(found.map((row) => row.id)).toEqual(["B", "C"]);
  });

  it("does not read INV-12 as INV-1", () => {
    expect(documentsNamedIn("INV-12", [invoice("1", 1), invoice("12", 1)]).map((row) => row.id)).toEqual(["12"]);
  });
});

describe("suggestLine", () => {
  it("skips what earlier lines for the same party already pay", () => {
    const earlier = line({
      partyId: "c1",
      amount: 30000,
      allocations: [{ invoiceId: "A", invoiceNumber: "INV-A", amount: 30000, tied: false }],
    });
    const result = suggestLine({
      partyId: "c1",
      amount: 60000,
      lines: [earlier],
      invoices: [invoice("A", 30000, "2026-10-01"), invoice("B", 50000, "2026-10-15")],
      creditNotes: [],
      credits: [],
    });
    expect(result.owing).toBe(50000);
    expect(result.allocations.map((row) => [row.invoiceId, row.amount])).toEqual([["B", 50000]]);
    expect(result.unapplied).toBe(10000);
  });
});

describe("postingGroups", () => {
  it("keeps each party's lines together in entry order", () => {
    const lines = [
      line({ key: "1", partyId: "a" }),
      line({ key: "2", partyId: "b" }),
      line({ key: "3", partyId: "a" }),
    ];
    expect(postingGroups(lines).map((group) => group.map((row) => row.key))).toEqual([["1", "3"], ["2"]]);
  });
});
