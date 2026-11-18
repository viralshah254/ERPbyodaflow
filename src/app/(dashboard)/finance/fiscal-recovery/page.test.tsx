import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), detail: vi.fn(), propose: vi.fn(), approve: vi.fn(), permissions: ["finance.read", "finance.tax.read", "finance.write", "finance.approve"], user: "maker" }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ permissions: mocks.permissions, user: { userId: mocks.user }, org: { orgId: "org" } }) }));
vi.mock("@/lib/api/fiscal-recovery", () => ({ fetchFiscalRecovery: mocks.fetch, fetchFiscalAttempt: mocks.detail, proposeFiscalOutcome: mocks.propose, approveFiscalOutcome: mocks.approve }));
vi.mock("@/components/layout/page-layout", () => ({ PageLayout: ({ children, title }: { children: React.ReactNode; title: string }) => <main><h1>{title}</h1>{children}</main> }));
import Page from "./page";
const attempt = { _id: "org:credit", documentId: "credit", typeKey: "credit-note", provider: "incotex", state: "UNCERTAIN", generation: 1, documentHash: "hash", updatedAt: "2026-01-01T00:00:00Z", dispatchedAt: "2026-01-01T00:00:00Z", payload: { total: 70 } };
beforeEach(() => { vi.clearAllMocks(); mocks.permissions = ["finance.read", "finance.tax.read", "finance.write", "finance.approve"]; mocks.user = "maker"; mocks.fetch.mockResolvedValue({ contract: "fiscal-recovery-v1", rows: [attempt], hasMore: false }); mocks.detail.mockResolvedValue(attempt); mocks.propose.mockResolvedValue({ ok: true }); });
afterEach(cleanup);
describe("fiscal recovery workspace", () => {
  it("keeps a failed load distinct from a healthy empty queue", async () => {
    mocks.fetch.mockRejectedValue(new Error("Backend unavailable")); render(<Page/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Backend unavailable");
    expect(screen.queryByText("No outstanding attempts in your scope")).not.toBeInTheDocument();
  });
  it("does not fetch without both finance and tax access", async () => {
    mocks.permissions = ["finance.read"]; render(<Page/>);
    expect(screen.getByRole("alert")).toHaveTextContent("tax read permissions"); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("lets the same finance approver clear a failed send and never sends another fiscal request", async () => {
    mocks.propose.mockResolvedValue({ ok: true, digest: "cleared-digest" });
    render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: /credit/ }));
    await screen.findByRole("radio", { name: /KRA did not accept it/ });
    fireEvent.change(screen.getByLabelText("What you checked"), { target: { value: "Looked on Incotex. This invoice is not there." } });
    fireEvent.click(screen.getByRole("button", { name: "Clear this attempt" }));
    await waitFor(() => expect(mocks.propose).toHaveBeenCalledWith("org:credit", { outcome: "NOT_ACCEPTED", evidenceReference: "Incotex check", reason: "Looked on Incotex. This invoice is not there." }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith("org:credit", "cleared-digest"));
  });
  it("asks a second person only when the saved choice claims KRA accepted the invoice", async () => {
    mocks.detail.mockResolvedValue({ ...attempt, review: { outcome: "ACCEPTED", reason: "Evidence checked", evidenceReference: "case", proposedBy: "maker" } });
    render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: /credit/ }));
    await screen.findByText("Waiting for a second person");
    expect(screen.queryByRole("button", { name: "Confirm this decision" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear this attempt" })).not.toBeInTheDocument();
  });
  it("approves only the frozen evidence revision actually displayed", async () => {
    mocks.user = "checker"; mocks.approve.mockResolvedValue({ ok: true });
    mocks.detail.mockResolvedValue({ ...attempt, review: { digest: "reviewed-evidence-digest", outcome: "NOT_ACCEPTED", reason: "Evidence checked", evidenceReference: "case", proposedBy: "maker" } });
    render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: /credit/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Clear this attempt" }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith("org:credit", "reviewed-evidence-digest"));
  });

});
