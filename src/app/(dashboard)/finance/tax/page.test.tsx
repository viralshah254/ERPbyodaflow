import * as React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), update: vi.fn(), create: vi.fn(), permissions: ["settings.financial.read", "admin.settings"] }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (state: unknown) => unknown) => select({ permissions: mocks.permissions, org: { orgId: "org" } }) }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header> }));
vi.mock("@/lib/api/financial-taxes", () => ({ fetchFinancialTaxesApi: mocks.fetch, updateFinancialTaxApi: mocks.update, createFinancialTaxApi: mocks.create }));
import Page from "./page";
beforeEach(() => { vi.clearAllMocks(); mocks.permissions = ["settings.financial.read", "admin.settings"]; mocks.fetch.mockResolvedValue([{ id: "vat", code: "VAT16", name: "Standard VAT", rate: 16, type: "VAT", effectiveFrom: "2026-01-01" }]); mocks.update.mockResolvedValue({ id: "vat" }); });
afterEach(cleanup);
describe("tax maintenance", () => {
  it("saves edits to the existing code and retains server errors for correction", async () => {
    mocks.update.mockRejectedValueOnce(new Error("A used tax rate is protected"));
    render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Standard revised name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("protected");
    expect(screen.getByLabelText("Name")).toHaveValue("Standard revised name");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    expect(mocks.update).toHaveBeenLastCalledWith("vat", expect.objectContaining({ name: "Standard revised name", rate: 16 }));
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps reader access read-only and surfaces load failures", async () => {
    mocks.permissions = ["finance.tax.read"]; mocks.fetch.mockRejectedValue(new Error("Tax service unavailable"));
    render(<Page/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("unavailable");
    expect(screen.queryByRole("button", { name: "Add tax code" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });
  it("protects used fields while revision creates a separate definition", async () => {
    mocks.fetch.mockResolvedValue([{ id: "vat", code: "VAT16", name: "Standard VAT", rate: 16, type: "VAT", effectiveFrom: "2026-01-01", used: true }]);
    render(<Page/>); fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Rate (%)")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Revise" }));
    expect(screen.getByLabelText("Code")).toHaveValue("");
    expect(screen.getByLabelText("Rate (%)")).toBeEnabled();
  });
});
