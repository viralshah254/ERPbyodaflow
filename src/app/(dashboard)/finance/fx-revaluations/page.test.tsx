import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ api: vi.fn(), userId: "maker", permissions: ["finance.read", "finance.bank.read", "finance.write", "finance.approve"] }));
vi.mock("@/lib/api/client", () => ({ apiRequest: state.api }));
vi.mock("@/lib/api/finance", () => ({ fetchFinanceAccountsApi: async () => [{ id: "gain", code: "4100", name: "FX gain", type: "REVENUE" }] }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ permissions: state.permissions, org: { orgId: "org" }, user: { userId: state.userId } }) }));
vi.mock("@/components/layout/page-layout", () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
import Page from "./page";
const legacy = { digest: "frozen-ledger", document: { id: "invoice", number: "INV-1", currency: "USD" }, baseCurrency: "KES", originalBase: 12000, originalRate: 120, remainingBase: 7200, gain: 400, terms: { postingDate: "2026-11-04", gainAccountId: "gain" }, item: { openAmount: 60 }, applications: [{ id: "application", paymentId: "old-payment", amount: 40, carryingBase: 4800, actualBase: 5200 }], journal: [{ accountId: "ar", debit: 400, credit: 0 }, { accountId: "gain", debit: 0, credit: 400 }], accounts: [{ id: "ar", code: "1100", name: "AR" }, { id: "gain", code: "4100", name: "FX gain" }] };
const preview = { digest: "frozen-ledger", baseCurrency: "KES", historicalBase: 12000, translatedBase: 13000, delta: 1000, terms: { postingDate: "2026-11-04", closingRate: 130, rateEvidence: "Closing schedule" }, accounts: legacy.accounts, journal: [{ accountId: "ar", debit: 1000, credit: 0 }, { accountId: "gain", debit: 0, credit: 1000 }] };
beforeEach(() => { vi.clearAllMocks(); state.userId = "maker"; state.permissions = ["finance.read", "finance.bank.read", "finance.write", "finance.approve"]; state.api.mockImplementation(async (url, options) => url.endsWith("/preview") ? { preview } : options?.method ? { ok: true } : { hasMore: false, items: [{ id: "invoice", number: "INV-1", type: "invoice", currency: "USD", openAmount: 100, records: [], legacyBatchIds: [], reviews: [{ _id: "case", kind: "FX_REVALUATION", state: "PENDING", digest: "case-digest", proposedBy: "maker", reason: "Prior application evidence", evidenceReference: "Original ledger", payload: preview }] }] }); });
afterEach(cleanup);
describe("FX valuation workspace", () => {
  it("requires evidence and invalidates a changed posting date independently of today's date", async () => {
    render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: /INV-1/ }));
    const postingDate = screen.getByLabelText("Posting date in an open period");
    fireEvent.change(postingDate, { target: { value: "2026-11-04" } });
    expect(screen.queryByRole("button", { name: "Send for independent approval" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview accounting" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Send for independent approval" })).toBeInTheDocument());
    expect(screen.getAllByText("KES 13,000.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Send for independent approval" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Evidence reference"), { target: { value: "Closing schedule" } });
    fireEvent.change(screen.getByLabelText("Preparation / review reason"), { target: { value: "Reconciled closing value" } });
    expect(screen.getByRole("button", { name: "Send for independent approval" })).toBeEnabled();
    fireEvent.change(postingDate, { target: { value: "2026-11-05" } });
    expect(screen.queryByRole("button", { name: "Send for independent approval" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve and post shown journals" })).not.toBeInTheDocument();
    expect(state.api).not.toHaveBeenCalledWith("/api/finance/fx-revaluations/prepare", expect.anything());
  });
  it("requires an independent review reason and sends the frozen case digest", async () => {
    state.userId = "checker"; render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: /INV-1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Approve and post shown journals" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("review reason");
    fireEvent.change(screen.getByLabelText("Preparation / review reason"), { target: { value: "Reconciled against original ledger" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve and post shown journals" }));
    await waitFor(() => expect(state.api).toHaveBeenCalledWith("/api/finance/fx-revaluations/case/review", expect.objectContaining({ method: "POST", body: { digest: "case-digest", approve: true, reason: "Reconciled against original ledger" } })));
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve and post shown journals" })).toBeEnabled());
  });
  it("keeps reader access read-only and displays service failures", async () => {
    state.permissions = ["finance.read", "finance.bank.read"]; state.api.mockRejectedValue(new Error("Ledger service unavailable"));
    render(<Page/>); expect(await screen.findByRole("alert")).toHaveTextContent("unavailable");
    expect(screen.queryByRole("button", { name: "Preview accounting" })).not.toBeInTheDocument();

  });
});
