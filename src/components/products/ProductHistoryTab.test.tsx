import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { fetchInventoryMovementsApi, fetchStockLevelsApi } from "@/lib/api/inventory-stock";
import { ProductHistoryTab } from "./ProductHistoryTab";

vi.mock("@/lib/api/inventory-stock", () => ({
  fetchStockLevelsApi: vi.fn(),
  fetchInventoryMovementsApi: vi.fn(),
}));

it("shows damaged stock separately and lets users retry the movement ledger without losing the warehouse data", async () => {
  vi.mocked(fetchStockLevelsApi).mockResolvedValue([{
    id: "damaged", productId: "p", sku: "CAKE", name: "Cake", warehouse: "Damage Store", warehouseId: "wh",
    quantity: 2, reserved: 0, available: 2, status: "In Stock", reorderLevel: 0, uom: "PCS",
    warehouseStockBlocked: true, warehouseStockState: "DAMAGED",
  }]);
  vi.mocked(fetchInventoryMovementsApi).mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce([{
    id: "move", date: "2026-11-12", type: "TRANSFER", sku: "CAKE", productName: "Cake", warehouse: "Dispatch",
    quantity: -2, uom: "PCS", sourceType: "transfer", sourceId: "x1", reference: "TRF-0001",
  }]);
  render(<ProductHistoryTab productId="p" />);
  const damaged = await screen.findByRole("row", { name: /Damage Store/ });
  expect(within(damaged).getByText("2 PCS")).toBeVisible();
  expect(within(damaged).getByText("Damaged")).toBeVisible();
  expect(within(damaged).queryByText("In Stock")).toBeNull();
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load stock movements.");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByRole("link", { name: "TRF-0001" })).toHaveAttribute("href", "/warehouse/transfers/x1");
  expect(screen.getByText("-2 PCS")).toBeVisible();
});
