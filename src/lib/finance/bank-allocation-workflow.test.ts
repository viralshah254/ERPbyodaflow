import { describe, expect, it } from "vitest";
import { bankAllocationAction, allocationBalance } from "./bank-allocation-workflow";
describe("bank allocation review", () => {
  it("requires permission and a different actor at each stage", () => {
    const proposal = { status: "SUGGESTED", suggestedBy: "maker", approvedBy: "checker", postedBy: "poster" };
    expect(bankAllocationAction(proposal, "maker", ["finance.approve"]).allowed).toBe(false);
    expect(bankAllocationAction(proposal, "checker", ["finance.write"]).allowed).toBe(false);
    expect(bankAllocationAction(proposal, "checker", ["finance.approve"]).allowed).toBe(true);
    expect(bankAllocationAction({ ...proposal, status: "APPROVED" }, "checker", ["finance.write"]).allowed).toBe(false);
    expect(bankAllocationAction({ ...proposal, status: "APPROVED" }, "poster", ["finance.write"]).allowed).toBe(true);
    expect(bankAllocationAction({ ...proposal, status: "POSTED" }, "poster", ["finance.approve"]).allowed).toBe(false);
    expect(bankAllocationAction({ ...proposal, status: "POSTED" }, "closer", ["finance.approve"]).allowed).toBe(true);
  });
  it("requires full, positive and finite allocations and shows the residual", () => {
    expect(allocationBalance(-100, { invoice: 40 })).toMatchObject({ remaining: 60, valid: false });
    expect(allocationBalance(100, { invoice: 120 })).toMatchObject({ remaining: -20, valid: false });
    expect(allocationBalance(100, { one: 40, two: 60 })).toMatchObject({ remaining: 0, valid: true });
    expect(allocationBalance(100, { one: 110, two: -10 }).valid).toBe(false);
    expect(allocationBalance(100, { one: NaN }).valid).toBe(false);
  });
});
