import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("./client", () => ({ apiRequest: state.request, requireLiveApi: vi.fn() }));
vi.mock("./payments", () => ({ fetchOpenBillsApi: vi.fn(), fetchOpenInvoicesApi: vi.fn() }));
import { fetchBankReconSnapshotApi } from "./bank-recon";
beforeEach(() => { vi.clearAllMocks(); state.request.mockImplementation(async (path: string) => path.endsWith("bank-accounts") ? { items: [{ id: "kes", name: "KES bank", currency: "KES" }, { id: "usd", name: "USD bank", currency: "USD" }] } : { items: [] }); });
describe("bank reconciliation account isolation", () => {
  it("selects an account before loading transactions, including on the first load", async () => {
    const result = await fetchBankReconSnapshotApi();
    expect(result.session.bankAccountId).toBe("kes");
    expect(state.request).toHaveBeenCalledWith("/api/finance/bank-recon", { params: { bankAccountId: "kes" } });
    expect(state.request).toHaveBeenCalledWith("/api/finance/payments", { params: { bankAccountId: "kes" } });
  });
  it("never falls back to a different account for an invalid selected account", async () => {
    await expect(fetchBankReconSnapshotApi("unavailable")).rejects.toThrow("no longer available");
    expect(state.request).toHaveBeenCalledTimes(1);
  });
  it("does not load organisation-wide payments when there are no accounts", async () => {
    state.request.mockResolvedValue({ items: [] });
    const result = await fetchBankReconSnapshotApi();
    expect(result.statements).toEqual([]);
    expect(result.systemTxns).toEqual([]);
    expect(state.request).toHaveBeenCalledTimes(1);
  });
});
