import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ preview: vi.fn(), save: vi.fn(), stores: vi.fn(), saved: vi.fn(), recommend: vi.fn() }));
vi.mock("@/lib/api/warehouses", () => ({ fetchWarehousesApi: mocks.stores }));
vi.mock("@/lib/api/manufacturing", () => ({ previewWorkOrderPreparation: mocks.preview, saveWorkOrderPreparation: mocks.save, fetchInputStoreRecommendation: mocks.recommend }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { WorkOrderPreparation } from "./work-order-preparation";
import type { ManufacturingWorkOrder } from "@/lib/api/manufacturing";
const order = { id: "wo", plannedQuantity: 10 } as ManufacturingWorkOrder;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.stores.mockResolvedValue([{ id: "rm", name: "Raw store", status: "ACTIVE" }, { id: "fg", name: "Finished store", status: "ACTIVE" }, { id: "old", name: "Inactive store", status: "INACTIVE" }]);
  mocks.preview.mockResolvedValue({ version: "v1", previewToken: "review", prepared: { bomSnapshot: { name: "Recipe" }, materialLines: [{ lineId: "in", productName: "Flour", warehouseId: "rm", plannedQuantity: 5, uom: "KG" }] } });
  mocks.save.mockResolvedValue({ ...order, preparationStatus: "READY" });
  mocks.recommend.mockResolvedValue(null);
});
afterEach(cleanup);
describe("operator preparation review", () => {
  it("requires explicit stores and review before saving and clears review after a store changes", async () => {
    render(<WorkOrderPreparation order={order} onSaved={mocks.saved} />);
    expect(screen.queryByText("Save reviewed preparation")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview preparation" })).toBeDisabled();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Raw store" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fg" } });
    expect(screen.queryByText("Inactive store")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview preparation" }));
    await screen.findByText("Flour");
    fireEvent.click(screen.getByRole("button", { name: "Save reviewed preparation" }));
    await waitFor(() => expect(mocks.saved).toHaveBeenCalledWith(expect.objectContaining({ preparationStatus: "READY" })));
    expect(mocks.save).toHaveBeenCalledWith("wo", { inputWarehouseIds: ["rm"], outputWarehouseId: "fg" }, expect.objectContaining({ previewToken: "review", version: "v1" }));
  });
  it("selects the store that already holds the ingredients", async () => {
    mocks.recommend.mockResolvedValue({ warehouseId: "rm", code: "PRD", name: "Production warehouse", linesNeeded: 2, linesCovered: 2, lines: [{ productId: "flour", productName: "Flour", requiredQty: 1, covered: true, onHandQty: 4 }] });
    render(<WorkOrderPreparation order={{ ...order, materialLines: [{ warehouseId: "old" }] } as ManufacturingWorkOrder} onSaved={mocks.saved} />);
    expect(await screen.findByText("Use PRD Production warehouse")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use this store" }));
    expect(screen.getByRole("checkbox", { name: "Raw store Recommended" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Finished store" })).not.toBeChecked();
  });
  it("invalidates a reviewed snapshot after changing stores", async () => {
    render(<WorkOrderPreparation order={order} onSaved={mocks.saved} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Raw store" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fg" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview preparation" }));
    await screen.findByText("Save reviewed preparation");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "rm" } });
    expect(screen.queryByText("Save reviewed preparation")).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
