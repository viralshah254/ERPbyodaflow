import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ permissions: ["reports.read", "sales.read"] as string[], templateId: "bakex" }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({ permissions: state.permissions }) }));
vi.mock("@/stores/orgContextStore", () => ({ useOrgContextStore: (selector: (s: unknown) => unknown) => selector({ templateId: state.templateId }) }));
import { FmcgReportCoverage } from "./FmcgReportCoverage";
describe("FMCG reporting workspace", () => {
  it("shows reports permitted by all source modules and filters them by module/search", () => {
    render(<FmcgReportCoverage />);
    expect(screen.getByRole("link", { name: /Overdue Sales Orders/ })).toHaveAttribute("href", "/reports/operations/overdue-sales-orders");
    expect(screen.queryByRole("link", { name: /Sales vs Purchases/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Executable Orders/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Search FMCG reports"), { target: { value: "overdue" } });
    expect(screen.queryByRole("link", { name: /Sales Rep Report/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Overdue Sales Orders/ })).toBeTruthy();
  });
  it("keeps unapproved commission rules non-runnable", () => {
    state.permissions = ["reports.read", "finance.ar.read"];
    render(<FmcgReportCoverage />);
    fireEvent.change(screen.getByLabelText("Report availability"), { target: { value: "planned" } });
    expect(screen.getByText("Rep Commissions")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Rep Commissions/ })).toBeNull();
    expect(screen.getAllByText("Rules needed").length).toBeGreaterThan(0);
  });
  it("does not expose the pack to other templates", () => {
    state.templateId = "retail";
    const { container } = render(<FmcgReportCoverage />);
    expect(container.textContent).toBe("");
  });
});
