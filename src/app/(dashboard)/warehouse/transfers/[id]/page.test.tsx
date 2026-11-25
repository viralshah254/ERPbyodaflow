import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { approveTransferShortage, downloadTransferPdf, fetchTransferById, saveTransferReceiptCounts } from "@/lib/api/warehouse-transfers";
import type { TransferRow } from "@/lib/types/warehouse";
import TransferDetailPage from "./page";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "t1" }) }));
vi.mock("@/components/layout/page-header", () => ({
  PageHeader: ({ actions }: { actions: React.ReactNode }) => <header>{actions}</header>,
}));
vi.mock("@/components/docs/DocumentTimeline", () => ({ DocumentTimeline: () => null }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteInventory: () => true, useHasPermission: () => true }));
vi.mock("@/lib/api/warehouse-transfers", () => ({
  fetchTransferById: vi.fn(),
  saveTransferReceiptCounts: vi.fn(),
  approveTransferShortage: vi.fn(),
  updateTransferStatus: vi.fn(),
  downloadTransferPdf: vi.fn().mockResolvedValue(true),
}));

it("requires the missing count by lot and explicitly confirms the Finance write-off", async () => {
  const transfer: TransferRow = {
    id: "t1", number: "TRF-1", date: "2026-11-12", fromWarehouse: "Finished Goods", toWarehouse: "Dispatch",
    transitWarehouse: "Transit", status: "IN_TRANSIT", reviewVersion: "review-v1", lines: [{
      id: "line", sku: "CAKE", productName: "Cake", quantity: 10, unit: "PCS",
      transitLots: [{ lotId: "a", lotNumber: "LOT-A", quantity: 6 }, { lotId: "b", lotNumber: "LOT-B", quantity: 4 }],
    }],
  };
  const reported: TransferRow = { ...transfer, reviewVersion: "review-v2", lines: [{
    ...transfer.lines[0]!, receivedQuantity: 8, receiptExceptionReason: "Missing on arrival",
    shortageReportRecorded: true, missingLots: [{ lotId: "b", quantity: 2 }],
  }] };
  vi.mocked(fetchTransferById).mockResolvedValueOnce(transfer).mockResolvedValue(reported);
  render(<TransferDetailPage />);
  fireEvent.change(await screen.findByLabelText("Received quantity for CAKE"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Shortage reason for CAKE"), { target: { value: "Missing on arrival" } });
  expect(screen.getByRole("button", { name: "Save receipt counts" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Missing quantity for lot LOT-B"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save receipt counts" }));
  expect(saveTransferReceiptCounts).toHaveBeenCalledWith("t1", [{ lineIndex: 0, receivedQuantity: 8, reason: "Missing on arrival", missingLots: [{ lotId: "b", quantity: 2 }] }]);
  const reviewButton = await screen.findByRole("button", { name: "Review and post shortage" });
  await waitFor(() => expect(reviewButton).toBeEnabled());
  fireEvent.click(reviewButton);
  expect(approveTransferShortage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm write-off and receipt" }));
  expect(approveTransferShortage).toHaveBeenCalledWith("t1", "review-v2");
});

it("leads back to the loading note the transfer was made for", async () => {
  const transfer: TransferRow = {
    id: "t1", number: "TRF-2", date: "2026-11-25", fromWarehouse: "DISPATCH", toWarehouse: "MAR", status: "DRAFT",
    reference: "Loader note LDN-0012", lines: [{ id: "line", sku: "CAKE", productName: "Cake", quantity: 3, unit: "EA" }],
  };
  vi.mocked(fetchTransferById).mockResolvedValue(transfer);
  window.history.replaceState(null, "", "/warehouse/transfers/t1?back=%2Fwarehouse%2Froute-pick-lists%2Fn12");
  const { unmount } = render(<TransferDetailPage />);
  expect(await screen.findByRole("link", { name: "Back to the loading note" })).toHaveAttribute("href", "/warehouse/route-pick-lists/n12");
  unmount();

  window.history.replaceState(null, "", "/warehouse/transfers/t1");
  render(<TransferDetailPage />);
  expect(await screen.findByRole("link", { name: "Back to route pick lists" })).toHaveAttribute("href", "/warehouse/route-pick-lists");
  fireEvent.click(screen.getByRole("button", { name: "Download transfer PDF" }));
  expect(downloadTransferPdf).toHaveBeenCalledWith("t1", "TRF-2", expect.any(Function));
  window.history.replaceState(null, "", "/");
});
