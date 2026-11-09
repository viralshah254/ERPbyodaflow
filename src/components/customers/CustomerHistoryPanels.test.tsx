import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CustomerActivityTable, CustomerInvoicesPanel } from "./CustomerHistoryPanels";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import { fetchArOpenPageApi, fetchArPaymentsPageApi } from "@/lib/api/payments";
vi.mock("@/lib/api/documents", () => ({ fetchDocumentListPageApi: vi.fn() }));
vi.mock("@/lib/api/payments", () => ({ fetchArOpenPageApi: vi.fn(), fetchArPaymentsPageApi: vi.fn() }));
const invoice = { id: "one", number: "INV-ONE", date: "2026-11-01", status: "POSTED", total: 116, currency: "KES" };
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.mocked(fetchDocumentListPageApi).mockReset().mockResolvedValue({ items: [invoice], hasMore: false, nextCursor: null, limit: 25, offset: 0, total: 2001 });
  vi.mocked(fetchArOpenPageApi).mockReset().mockResolvedValue({ items: [], outstandingTotal: 0, openCount: 0, hasMore: false });
  vi.mocked(fetchArPaymentsPageApi).mockReset().mockResolvedValue({ items: [], hasMore: false, nextCursor: null, limit: 25, offset: 0 });
});
it("requests one bounded page and follows the real server cursor on Next", async () => {
  vi.mocked(fetchDocumentListPageApi).mockResolvedValueOnce({ items: [invoice], total: 2001, hasMore: true, nextCursor: "25", limit: 25, offset: 0 });
  render(<CustomerActivityTable partyId="customer" kind="invoice" label="Invoices" />);
  await screen.findByText("INV-ONE");
  expect(fetchDocumentListPageApi).toHaveBeenCalledTimes(1);
  expect(fetchDocumentListPageApi).toHaveBeenLastCalledWith("invoice", { partyId: "customer", limit: 25, cursor: "" });
  fireEvent.click(screen.getByRole("button", { name: /Next/ }));
  await waitFor(() => expect(fetchDocumentListPageApi).toHaveBeenLastCalledWith("invoice", { partyId: "customer", limit: 25, cursor: "25" }));
  expect(fetchArPaymentsPageApi).not.toHaveBeenCalled();
});
it("does not classify a posted invoice as cleared merely because it is absent from an open page", async () => {
  render(<CustomerInvoicesPanel partyId="customer" canReadAr />);
  await screen.findByText("INV-ONE");
  expect(screen.queryByText("Cleared")).not.toBeInTheDocument();
  expect(screen.getByText(/remaining balance/)).toBeInTheDocument();
});
it("keeps a failed load distinct from no activity and supports retry", async () => {
  vi.mocked(fetchDocumentListPageApi).mockRejectedValueOnce(new Error("Unavailable"));
  render(<CustomerActivityTable partyId="customer" kind="invoice" label="Invoices" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unavailable");
  expect(screen.queryByText("No invoices found.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry invoices" }));
  await screen.findByText("INV-ONE");
});
it("does not request financial open items without AR access", async () => {
  render(<CustomerInvoicesPanel partyId="customer" canReadAr={false} />);
  await screen.findByText("INV-ONE");
  expect(fetchArOpenPageApi).not.toHaveBeenCalled();
});
