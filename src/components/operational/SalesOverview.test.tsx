import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ list: vi.fn(), api: vi.fn(), permissions: ["sales.read"], finance: false }));
vi.mock("@/lib/api/documents", () => ({ fetchDocumentListPageApi: state.list }));
vi.mock("@/lib/api/client", () => ({ isApiConfigured: () => true, apiRequest: state.api }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteSales: () => false, useHasPermission: () => state.finance }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (selector: (value: typeof state) => unknown) => selector(state) }));
vi.mock("@/components/tutorial/PageHelp", () => ({ PageHelp: () => null }));
vi.mock("@/components/command/CommandPaletteHint", () => ({ CommandPaletteHint: () => null }));
vi.mock("@/components/customers/CustomerLink", () => ({ CustomerLink: () => null }));
import Page from "@/app/(dashboard)/sales/overview/page";
beforeEach(() => { state.list.mockReset().mockResolvedValue({ total: 5, items: [] }); state.api.mockReset(); state.finance = false; });
afterEach(cleanup);
describe("sales overview evidence states", () => {
  it("shows operational counts without requesting unauthorized finance data", async () => {
    render(<Page />); await screen.findByText("20");
    expect(screen.getByText("Managed by finance")).toBeInTheDocument();
    expect(state.api).not.toHaveBeenCalled();
  });
  it("does not display failed sales requests as zero orders", async () => {
    state.list.mockRejectedValue(new Error("Sales service unavailable")); render(<Page />);
    await screen.findByRole("alert"); expect(screen.getByText(/Sales service unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });
  it("rejects missing count evidence rather than presenting a one-row sample as a total", async () => {
    state.list.mockResolvedValue({ items: [{ id: "sample" }] }); render(<Page />);
    await screen.findByRole("alert"); expect(screen.getByText(/complete sales count/)).toBeInTheDocument();
  });
});
