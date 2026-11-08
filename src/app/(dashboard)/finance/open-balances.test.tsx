import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ ar: vi.fn(), ap: vi.fn(), payments: vi.fn() }));
vi.mock("@/lib/api/payments", () => ({ fetchArOpenPageApi: mocks.ar, fetchApOpenPageApi: mocks.ap, fetchArPaymentsApi: mocks.payments, fetchApPaymentsApi: mocks.payments }));
vi.mock("@/lib/org/useBaseCurrency", () => ({ useBaseCurrency: () => "KES" }));
vi.mock("@/components/layout/page-layout", () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/customers/CustomerLink", () => ({ CustomerLink: ({ name }: { name: string }) => <span>{name}</span> }));
import ArPage from "./ar/page";
import ApPage from "./ap/page";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.payments.mockResolvedValue([]);
  for (const fn of [mocks.ar, mocks.ap]) fn.mockResolvedValue({ items: [], outstandingTotal: 200, openCount: 200, hasMore: true });
});
afterEach(cleanup);
it.each([["AR", ArPage, mocks.ar], ["AP", ApPage, mocks.ap]] as const)("pages %s records and stops at the final page", async (_side, Page, load) => {
  render(<Page />);
  const next = screen.getByRole("button", { name: "Next" });
  await waitFor(() => expect(next).toBeEnabled());
  expect(load).toHaveBeenCalledWith(undefined, { offset: 0, limit: 50 });
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  load.mockResolvedValue({ items: [], outstandingTotal: 200, openCount: 200, hasMore: false });
  fireEvent.click(next);
  await waitFor(() => expect(load).toHaveBeenLastCalledWith(undefined, { offset: 50, limit: 50 }));
  await waitFor(() => expect(next).toBeDisabled());
  expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
});
it("labels overdue figures as page-specific", async () => {
  render(<ArPage />);
  expect(await screen.findByText("Overdue on this page")).toBeInTheDocument();
});
it("shows a failed page without claiming the empty result is current", async () => {
  mocks.ap.mockRejectedValue(new Error("Service unavailable"));
  render(<ApPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this page");
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});

it("shows different currencies separately without relabelling dollars as shillings", async () => {
  mocks.ap.mockResolvedValue({ items: [], outstandingTotal: 85, openCount: 3, hasMore: false, outstandingByCurrency: [{ currency: "KES", total: 75, count: 2 }, { currency: "USD", total: 10, count: 1 }] });
  render(<ApPage />);
  await waitFor(() => expect(screen.getByText("$10.00")).toBeInTheDocument());
  expect(screen.queryByText(/KES\s*85/)).not.toBeInTheDocument();
});
