import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { createInventoryQualityCaseApi, fetchInventoryQualityCasesApi, searchInventoryLotsApi } from "@/lib/api/inventory-quality";
import InventoryQualityPage from "./page";

vi.mock("@/components/layout/page-header", () => ({ PageHeader: () => null }));
vi.mock("@/lib/api/inventory-quality", () => ({
  createInventoryQualityCaseApi: vi.fn(),
  fetchInventoryQualityCasesApi: vi.fn(),
  searchInventoryLotsApi: vi.fn(),
}));

it("clears the selected lot and quantity when the operator searches for a different lot", async () => {
  vi.mocked(fetchInventoryQualityCasesApi).mockResolvedValue([]);
  vi.mocked(searchInventoryLotsApi).mockResolvedValue([{
    id: "batch-a", lotNumber: "LOT-A", productName: "Cake", remainingQuantity: 12, status: "RELEASED",
  } as Awaited<ReturnType<typeof searchInventoryLotsApi>>[number]]);
  render(<InventoryQualityPage />);
  const lotSearch = screen.getByLabelText("Lot");
  fireEvent.change(lotSearch, { target: { value: "LOT-A" } });
  fireEvent.click(await screen.findByRole("button", { name: /LOT-A.*12 left/ }));
  fireEvent.change(screen.getByLabelText("Reason / evidence"), { target: { value: "Packaging damage" } });
  expect(screen.getByRole("button", { name: "Open case" })).toBeEnabled();
  fireEvent.change(lotSearch, { target: { value: "LOT-B" } });
  expect(screen.getByLabelText("Affected quantity")).toHaveValue(null);
  expect(screen.getByRole("button", { name: "Open case" })).toBeDisabled();
  expect(createInventoryQualityCaseApi).not.toHaveBeenCalled();
});
