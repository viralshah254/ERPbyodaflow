import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ preview: vi.fn(), save: vi.fn(), stores: vi.fn(), saved: vi.fn(), recommend: vi.fn() }));
vi.mock("@/lib/api/warehouses", () => ({ fetchWarehousesApi: mocks.stores, fetchAllWarehousesApi: mocks.stores }));
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
    fireEvent.change(screen.getByRole("textbox", { name: "Find an output store" }), { target: { value: "Finished" } });
    expect(screen.queryByRole("radio", { name: "Raw store" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Finished store" }));
    expect(screen.queryByText("Inactive store")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview preparation" }));
    await screen.findByText("Flour");
    fireEvent.click(screen.getByRole("button", { name: "Save reviewed preparation" }));
    await waitFor(() => expect(mocks.saved).toHaveBeenCalledWith(expect.objectContaining({ preparationStatus: "READY" })));
    expect(mocks.save).toHaveBeenCalledWith("wo", { inputWarehouseIds: ["rm"], outputWarehouseId: "fg" }, expect.objectContaining({ previewToken: "review", version: "v1" }));
  });
  it("lists the recommended store first, then shelf stores, on input and output", async () => {
    mocks.stores.mockResolvedValue([
      { id: "c4", code: "C4", name: "C4 FRIDAY", status: "ACTIVE" },
      { id: "prd", code: "PRD", name: "PRODUCTION WARE HOUSE", status: "ACTIVE", purpose: "STORAGE" },
      { id: "dsp", code: "DSP", name: "Dispatch", status: "ACTIVE", purpose: "DISPATCH" },
    ]);
    mocks.recommend.mockResolvedValue({ warehouseId: "c4", code: "C4", name: "C4 FRIDAY", linesNeeded: 1, linesCovered: 1, lines: [{ productId: "flour", productName: "Flour", requiredQty: 1, covered: true, onHandQty: 4 }] });
    render(<WorkOrderPreparation order={order} onSaved={mocks.saved} />);
    const names = (role: "checkbox" | "radio") => screen.findAllByRole(role).then((rows) => rows.map((row) => row.closest("label")?.textContent));
    expect(await names("checkbox")).toEqual(["C4 C4 FRIDAY", "DSP Dispatch", "PRD PRODUCTION WARE HOUSE"]);
    expect(await names("radio")).toEqual(["PRD PRODUCTION WARE HOUSE", "DSP Dispatch", "C4 C4 FRIDAY"]);
    await waitFor(() => expect(screen.getByRole("radio", { name: "PRD PRODUCTION WARE HOUSE" })).toBeChecked());
  });
  it("selects the store that already holds the ingredients", async () => {
    mocks.recommend.mockResolvedValue({ warehouseId: "rm", code: "PRD", name: "Production warehouse", linesNeeded: 2, linesCovered: 2, lines: [{ productId: "flour", productName: "Flour", requiredQty: 1, covered: true, onHandQty: 4 }] });
    render(<WorkOrderPreparation order={{ ...order, materialLines: [{ warehouseId: "old" }] } as ManufacturingWorkOrder} onSaved={mocks.saved} />);
    const marker = await screen.findByRole("button", { name: "Recommended" });
    expect(marker).toHaveAttribute("title", expect.stringContaining("Flour"));
    fireEvent.click(marker);
    expect(screen.getByRole("checkbox", { name: "Raw store" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Finished store" })).not.toBeChecked();
  });
  it("clears the chosen stores when the batch is restarted", async () => {
    const prepared = { ...order, materialLines: [{ warehouseId: "rm" }], outputLines: [{ warehouseId: "fg" }] } as ManufacturingWorkOrder;
    const { rerender } = render(<WorkOrderPreparation order={prepared} onSaved={mocks.saved} restartToken={0} />);
    expect(await screen.findByRole("checkbox", { name: "Raw store" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Finished store" })).toBeChecked();
    rerender(<WorkOrderPreparation order={prepared} onSaved={mocks.saved} restartToken={1} />);
    expect(screen.getByRole("checkbox", { name: "Raw store" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Finished store" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Preview preparation" })).toBeDisabled();
  });
  it("invalidates a reviewed snapshot after changing stores", async () => {
    render(<WorkOrderPreparation order={order} onSaved={mocks.saved} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Raw store" }));
    fireEvent.click(screen.getByRole("radio", { name: "Finished store" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview preparation" }));
    await screen.findByText("Save reviewed preparation");
    fireEvent.click(screen.getByRole("radio", { name: "Raw store" }));
    expect(screen.queryByText("Save reviewed preparation")).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
