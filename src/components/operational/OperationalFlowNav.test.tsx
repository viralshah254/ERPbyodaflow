import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (selector: (value: typeof state) => unknown) => selector(state) }));
import { OperationalFlowNav } from "./OperationalFlowNav";
afterEach(cleanup);
describe("cross-module workflow navigation", () => {
  it("shows the handoff without linking into unauthorized finance modules", () => {
    state.permissions = ["purchase.read"]; render(<OperationalFlowNav flow="purchasing" current="Orders" />);
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Supplier bills" })).not.toBeInTheDocument();
    expect(screen.getByText("Supplier bills")).toBeInTheDocument();
  });
  it("links permitted finance and production work to their actual screens", () => {
    state.permissions = ["*"]; render(<OperationalFlowNav flow="manufacturing" current="Daily plan" />);
    expect(screen.getByRole("link", { name: "Daily plan" })).toHaveAttribute("href", "/manufacturing/production-plan");
    expect(screen.getByRole("link", { name: "Quality" })).toHaveAttribute("href", "/manufacturing/quality");
  });
});
