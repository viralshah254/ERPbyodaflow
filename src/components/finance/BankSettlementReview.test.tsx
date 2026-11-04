import * as React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ preview: vi.fn(), accounts: vi.fn() }));
vi.mock("@/lib/api/bank-recon", () => ({ previewBankSettlementApi: mocks.preview }));
vi.mock("@/lib/api/finance", () => ({ fetchFinanceAccountsApi: mocks.accounts }));
import { BankSettlementReview } from "./BankSettlementReview";
const preview = { digest: "proof", statement: { amount: 12900 }, invoiceCurrency: "USD", bankCurrency: "KES", baseCurrency: "KES", totalAllocated: 100, equation: { bankBase: 12900, feeBase: 100, carryingBase: 12000, fxGain: 1000 }, accounts: [], legs: [], sources: [{ id: "invoice", number: "INV-1", amount: 100, currency: "USD", originalRate: 120, carryingBase: 12000 }] };
beforeEach(() => { vi.clearAllMocks(); mocks.accounts.mockResolvedValue([]); mocks.preview.mockResolvedValue(preview); });
afterEach(cleanup);
function props() { return { enabled: true, onEnabled: vi.fn(), lineId: "line", partyId: "customer", allocations: [{ documentId: "invoice", amount: 100 }], bankCurrency: "KES", baseCurrency: "KES", disabled: false, onReady: vi.fn() }; }
describe("reviewed bank fees and FX", () => {
  it("shows server evidence and invalidates it when rates or allocations change", async () => {
    const input = props(); const view = render(<BankSettlementReview {...input}/>);
    fireEvent.change(screen.getByLabelText("Bank advice / rate evidence"), { target: { value: "Bank advice 123" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview balanced settlement" }));
    expect(await screen.findByText("Balanced settlement preview")).toBeInTheDocument();
    expect(screen.getByText("Realised FX gain")).toBeInTheDocument();
    expect(input.onReady).toHaveBeenLastCalledWith(expect.objectContaining({ preview }));
    fireEvent.change(screen.getByLabelText("Invoice currency → KES rate"), { target: { value: "131" } });
    expect(screen.queryByText("Balanced settlement preview")).not.toBeInTheDocument();
    expect(input.onReady).toHaveBeenLastCalledWith(null);
    view.rerender(<BankSettlementReview {...input} allocations={[{ documentId: "invoice", amount: 50 }]}/>);
    expect(input.onReady).toHaveBeenLastCalledWith(null);
  });
  it("does not accept a response from an obsolete source selection", async () => {
    let finish!: (value: typeof preview) => void;
    mocks.preview.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const input = props(); const view = render(<BankSettlementReview {...input}/>);
    fireEvent.change(screen.getByLabelText("Bank advice / rate evidence"), { target: { value: "Bank advice 123" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview balanced settlement" }));
    view.rerender(<BankSettlementReview {...input} lineId="different-line"/>);
    finish(preview);
    await waitFor(() => expect(screen.getByRole("button", { name: "Preview balanced settlement" })).toBeEnabled());
    expect(screen.queryByText("Balanced settlement preview")).not.toBeInTheDocument();
    expect(input.onReady.mock.calls.some(([value]) => value?.preview)).toBe(false);
  });
  it("shows reconciliation errors and lets the user correct and preview again", async () => {
    mocks.preview.mockRejectedValueOnce(new Error("Bank movement does not reconcile"));
    const input = props(); render(<BankSettlementReview {...input}/>);
    fireEvent.change(screen.getByLabelText("Bank advice / rate evidence"), { target: { value: "Bank advice 123" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview balanced settlement" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("does not reconcile");
    expect(input.onReady).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole("button", { name: "Preview balanced settlement" }));
    expect(await screen.findByText("Balanced settlement preview")).toBeInTheDocument();
  });
});
