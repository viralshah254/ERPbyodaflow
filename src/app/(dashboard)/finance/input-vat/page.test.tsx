import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ api: vi.fn(), user: "maker", confirmed: true }));
vi.mock("@/lib/api/client", () => ({ apiRequest: state.api }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ permissions: ["finance.read", "finance.tax.read", "finance.write", "finance.approve"], user: { userId: state.user }, org: { orgId: "org" } }) }));
vi.mock("@/components/layout/page-layout", () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
import Page from "./page";
beforeEach(() => { vi.clearAllMocks(); state.user = "maker"; state.confirmed = true; state.api.mockImplementation(async (_url, options) => options?.method ? { ok: true } : { policy: { confirmed: state.confirmed, registration: "REGISTERED", recovery: "PARTIAL" }, items: [{ id: "bill", number: "B-1", currency: "KES", tax: 16, status: "DRAFT", reviews: [{ _id: "review", state: "PENDING", digest: "frozen", proposedBy: "maker", reason: "Common service VAT", evidenceReference: "Schedule reference", payload: { recoverable: 8, nonrecoverable: 8 } }] }], hasMore: false }); });
afterEach(cleanup);
describe("input VAT workflow", () => {
  it("keeps missing finance policy visible and prevents preparing an allocation", async () => {
    state.confirmed = false; render(<Page/>);
    expect(await screen.findByText(/Tax recovery setup is pending/)).toHaveTextContent("Tax recovery setup is pending");
    fireEvent.click(screen.getByRole("button", { name: /B-1/ }));
    expect(screen.getByRole("button", { name: "Save for independent review" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Open source bill" })).toHaveAttribute("href", "/docs/bill/bill");
  });
  it("prevents the preparer from approving their own VAT evidence", async () => {
    render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: /B-1/ }));
    expect(screen.getByText(/Recoverable KES 8/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve shown allocation" })).not.toBeInTheDocument();
  });
  it("requires a reason and sends the frozen digest for an independent review", async () => {
    state.user = "checker"; render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: /B-1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Approve shown allocation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("review reason");
    fireEvent.change(screen.getByLabelText("Preparation / review reason"), { target: { value: "Checked against approved schedule" } });
    fireEvent.click(screen.getByRole("button", { name: "Approve shown allocation" }));
    expect(state.api).toHaveBeenCalledWith("/api/finance/input-vat/review/review", expect.objectContaining({ method: "POST", body: { digest: "frozen", approve: true, reason: "Checked against approved schedule" } }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve shown allocation" })).toBeEnabled());
  });
  it("requires a current stock-cost preview and clears it when the treatment changes", async () => {
    const costPreview = { digest: "stock-proof", currency: "KES", total: 16, rounding: 0, stock: [{ key: "raw", productId: "raw", quantity: 50, value: 8, before: 10, after: 10.16 }], wip: [], allocations: [{ accountId: "stock", amount: 8, label: "Remaining raw stock" }, { accountId: "cogs", amount: 8, label: "Sold stock" }] };
    state.api.mockImplementation(async (url, options) => url.endsWith("/preview") ? { costPreview } : options?.method ? { ok: true } : { canReviewInventoryCost: true, policy: { confirmed: true, registration: "REGISTERED", recovery: "NONE" }, hasMore: false, items: [{ id: "bill", number: "B-1", currency: "KES", tax: 16, status: "DRAFT", lines: [{ lineId: "raw", label: "Raw material", tax: 16, productId: "raw" }], reviews: [] }] });
    render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: /B-1/ }));
    fireEvent.change(screen.getByLabelText("VAT directly attributable to taxable supplies"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Blocked / exempt-use VAT"), { target: { value: "16" } });
    fireEvent.change(screen.getByLabelText("Evidence reference"), { target: { value: "Approved classification" } });
    fireEvent.change(screen.getByLabelText("Preparation / review reason"), { target: { value: "Blocked-use material" } });
    expect(screen.getByRole("button", { name: "Save for independent review" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Preview tax and cost allocation" }));
    expect(await screen.findByRole("region", { name: "Inventory VAT cost preview" })).toHaveTextContent("Where this VAT cost goes");
    expect(screen.getByRole("button", { name: "Save for independent review" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Common VAT to apportion"), { target: { value: "1" } });
    expect(screen.queryByRole("region", { name: "Inventory VAT cost preview" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save for independent review" })).toBeDisabled();
  });

});
