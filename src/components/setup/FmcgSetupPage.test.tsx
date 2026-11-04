import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { writeFileSync } from "node:fs";
const state = vi.hoisted(() => ({ fetch: vi.fn(), canEdit: true, patch: vi.fn() }));
vi.mock("@/lib/api/fmcg-setup", () => ({ fetchFmcgSetup: state.fetch }));
vi.mock("@/lib/api/client", () => ({ apiRequest: state.patch }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useHasPermission: () => state.canEdit }));
vi.mock("@/components/tutorial/PageHelp", () => ({ PageHelp: () => null }));
vi.mock("@/components/command/CommandPaletteHint", () => ({ CommandPaletteHint: () => null }));
import Page from "@/app/(dashboard)/settings/fmcg-setup/page";
const fixture = () => ({ version: "fmcg-setup-v2", capturedAt: "2026-11-02T12:00:00Z", orgId: "synthetic", openingDate: "2026-12-01", fiscalYearEndMonth: 12, status: "PREPARING", valuationMethod: "COMPANY_AVERAGE", readyForAcceptance: false,
  gates: [
    { id: "cutover", title: "Opening date and fiscal calendar", status: "PASS", detail: "One open period covers opening.", required: true, href: "/settings/financial/fiscal-years" },
    { id: "mapping", title: "Posting account mappings", status: "PENDING", detail: "Review accounts payable, production WIP and goods received not invoiced.", required: true, href: "/settings/financial/posting-mappings" },
    { id: "warehouses", title: "Classify operational stores", status: "PENDING", detail: "Three stores need purpose and branch review before they can supply demand.", required: true, href: "/master/warehouses" },
    { id: "company_cost", title: "Reviewed company-wide SKU opening costs", status: "PENDING", detail: "Twenty positive stock positions need reviewed costs.", required: true, href: "/inventory/valuation" },
    { id: "stock_gl", title: "Current inventory and WIP tie to GL", status: "PENDING", detail: "Complete costs and account mappings before reconciliation.", required: true, href: "/finance/gl" },
  ], taxProfile: { vatRegistration: "UNCONFIRMED", withholdingVatAgent: "UNCONFIRMED", inputTaxRecoverability: "UNCONFIRMED", evidenceReference: "" },
  totals: { stockRows: 40, missingCostRows: 20, physicalValue: null, wipValue: null, glValue: null, difference: null },
});
beforeEach(() => { state.canEdit = true; state.fetch.mockReset().mockResolvedValue(fixture()); state.patch.mockReset(); });
afterEach(cleanup);
describe("operational preparation flow", () => {
  it("explains dependencies, owners and unknown reconciliation without claiming go-live", async () => {
    render(<Page />);
    await screen.findByRole("heading", { name: "Build a confident first posting day" });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText(/Complete first: Posting account mappings/)).toBeInTheDocument();
    expect(screen.getAllByText("Needs reconciliation")).toHaveLength(4);
    expect(screen.getByText(/does not authorize live posting/)).toBeInTheDocument();
    if (process.env.ERP_SETUP_PREVIEW_HTML) writeFileSync(process.env.ERP_SETUP_PREVIEW_HTML, `<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FMCG setup · synthetic design review</title><link rel="stylesheet" href="/setup.css"></head><body><div style="max-width:1440px;margin:0 auto">${document.body.innerHTML}</div></body></html>`);
  });
  it("takes the next task to its stage and filters checked work", async () => {
    render(<Page />); fireEvent.click(await screen.findByRole("button", { name: "Next: Posting account mappings" }));
    expect(screen.getByRole("checkbox", { name: "Needs attention only" })).toBeChecked();
    expect(screen.queryByRole("heading", { name: "Classify operational stores" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Opening date and fiscal calendar" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Map posting accounts/ })).toHaveAttribute("href", "/settings/financial/posting-mappings");
  });
  it("rejects an older setup contract instead of presenting incomplete checks as current", async () => {
    state.fetch.mockResolvedValueOnce({ ...fixture(), version: "fmcg-setup-v1" });
    render(<Page />); await screen.findByRole("heading", { name: "Setup checks are unavailable" });
    expect(screen.getByText(/Update the connected server/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("keeps tax editing disabled for a read-only role", async () => {
    state.canEdit = false; render(<Page />); await screen.findByText("Kenya tax profile");
    expect(screen.getByLabelText("VAT registration")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save confirmed tax profile" })).not.toBeInTheDocument();
  });
  it("clears stale check results on refresh failure and offers a retry", async () => {
    render(<Page />); await screen.findByRole("progressbar");
    state.fetch.mockRejectedValueOnce(new Error("Deploy the matching backend."));
    fireEvent.click(screen.getByRole("button", { name: "Refresh checks" }));
    await screen.findByRole("heading", { name: "Setup checks are unavailable" });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("progressbar")).toBeInTheDocument());
  });
});
