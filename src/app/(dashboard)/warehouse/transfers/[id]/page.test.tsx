import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { approveTransferShortage, fetchTransferById, saveTransferReceiptCounts } from "@/lib/api/warehouse-transfers";
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
