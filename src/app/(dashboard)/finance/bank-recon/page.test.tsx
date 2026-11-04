import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ snapshot: vi.fn(), suggestions: vi.fn(), match: vi.fn(), controls: vi.fn(), proposals: vi.fn(), permissions: ["finance.bank.read", "finance.write"], userId: "maker" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ permissions: state.permissions, user: { userId: state.userId }, org: { orgId: "org" } }) }));
vi.mock("@/lib/org/useBaseCurrency", () => ({ useBaseCurrency: () => "KES" }));
vi.mock("@/components/layout/page-shell", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header> }));
vi.mock("@/lib/api/bank-recon", () => ({
  fetchBankReconSnapshotApi: state.snapshot, fetchBankReconSuggestionsApi: state.suggestions, matchBankReconToDocumentApi: state.match,
  fetchBankAllocationProposalsApi: state.proposals, fetchControlAccountReconciliationApi: state.controls,
  fetchBankReconSessionsApi: async () => [], autoMatchBankReconApi: vi.fn(), completeBankReconApi: vi.fn(),
  createBankReconAdjustingEntryApi: vi.fn(), advanceBankAllocationProposalApi: vi.fn(), fetchBankReconOpenItemsApi: async () => [],
  matchBankReconLinesApi: vi.fn(), suggestBankAllocationApi: vi.fn(),
}));
import Page from "./page";
const line = { id: "line", date: "2026-11-03", description: "Customer deposit", amount: 100, payIn: 100, payOut: 0, status: "PENDING" };
beforeEach(() => {
  vi.clearAllMocks(); state.permissions = ["finance.bank.read", "finance.write"];
  state.snapshot.mockResolvedValue({ bankAccounts: [{ id: "bank", name: "Test Bank", currency: "KES" }], session: { bankAccountId: "bank", bankAccountName: "Test Bank", statementCurrency: "KES", status: "OPEN" }, statements: [line], systemTxns: [] });
  state.suggestions.mockResolvedValue([{ id: "invoice", number: "INV-1", partyName: "Test Customer", side: "AR", outstanding: 100, currency: "KES" }]);
  state.proposals.mockResolvedValue([]); state.controls.mockResolvedValue([]); state.match.mockResolvedValue({ paymentId: "payment", number: "AR-1" });
});
afterEach(cleanup);
describe("bank reconciliation posting review", () => {
  it("requires a payment preview and prevents duplicate clicks while the request is pending", async () => {
    state.match.mockImplementation(() => new Promise(() => {}));
    render(<Page/>);
    fireEvent.click(await screen.findByRole("button", { name: "Match" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create payment & match" }));
    expect(state.match).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("creates a new receipt");
    const confirm = screen.getAllByRole("button", { name: "Create payment & match" }).at(-1)!;
    fireEvent.click(confirm); fireEvent.click(confirm);
    await waitFor(() => expect(state.match).toHaveBeenCalledTimes(1));
    expect(state.match).toHaveBeenCalledWith("line", "invoice");
    expect(await screen.findByRole("button", { name: "Posting…" })).toBeDisabled();
  });
  it("keeps reader actions disabled and does not request an unauthorised finance control report", async () => {
    state.permissions = ["finance.bank.read"];
    render(<Page/>);
    await screen.findByText("Customer deposit");
    expect(screen.getByRole("button", { name: "Auto-match payments" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Group allocation" })).toBeDisabled();
    expect(state.controls).not.toHaveBeenCalled();
  });
  it("previews the bank amount when paying part of a larger invoice", async () => {
    state.suggestions.mockResolvedValue([{ id: "invoice", number: "INV-1", partyName: "Test Customer", side: "AR", outstanding: 200, currency: "KES" }]);
    render(<Page/>);
    fireEvent.click(await screen.findByRole("button", { name: "Match" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create payment & match" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("100.00");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("200.00");
    expect(state.match).not.toHaveBeenCalled();
  });
  it("shows a refresh failure instead of presenting it as an empty reconciled queue", async () => {
    state.snapshot.mockRejectedValue(new Error("Bank service unavailable"));
    render(<Page/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Bank service unavailable");
    expect(screen.getByRole("button", { name: "Retry refresh" })).toBeInTheDocument();
  });
});
