import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), fetch: vi.fn(), action: vi.fn() }));
vi.mock("@/components/layout/page-shell", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: () => <h1>Record production</h1> }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteManufacturing: () => true }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (s: object) => unknown) => select({ org: { orgId: "joy" } }) }));
vi.mock("@/lib/api/warehouses", () => ({ fetchWarehousesApi: async () => [{ id: "raw", name: "Raw materials" }, { id: "finished", name: "Finished goods" }] }));
vi.mock("@/lib/api/manufacturing", () => ({
  fetchProductionPlanDefaults: async () => ({ items: [{ productId: "cake", productName: "Cake", uom: "EA" }] }),
  createManufacturingWorkOrder: mocks.create, fetchManufacturingWorkOrder: mocks.fetch, runManufacturingWorkOrderAction: mocks.action,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
import { ProductionOutputEntry } from "./ProductionOutputEntry";
const draft = { id: "wo", number: "WO-1", status: "DRAFT", quantity: 10, materialLines: [{ lineId: "flour", productName: "Flour", plannedQuantity: 2, uom: "KG", warehouseId: "raw" }], outputLines: [] };
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); sessionStorage.clear(); mocks.create.mockResolvedValue({ id: "wo" }); mocks.fetch.mockResolvedValue(draft); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function prepare() {
  render(<ProductionOutputEntry />);
  await screen.findByRole("option", { name: /Cake/ });
  fireEvent.change(screen.getByRole("combobox", { name: /^Finished product/ }), { target: { value: "cake" } });
  fireEvent.change(screen.getByLabelText(/^Finished quantity/), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText(/^Measured finished weight/), { target: { value: "4" } });
  fireEvent.change(screen.getByLabelText("Ingredient store"), { target: { value: "raw" } });
  fireEvent.change(screen.getByLabelText("Finished goods store"), { target: { value: "finished" } });
  fireEvent.click(screen.getByRole("button", { name: "Calculate ingredients" }));
  await screen.findByText("Flour");
}
it("uses count for recipe scaling and measured mass as separate completion evidence", async () => {
  await prepare();
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 10, measurementMode: "MANUAL_SCALE", weighingRequired: true, requestId: expect.any(String) }));
  expect(mocks.action).not.toHaveBeenCalled();
  mocks.action.mockImplementation(async (_id, { action }) => ({ ...draft, status: action === "release" ? "RELEASED" : action === "start" ? "IN_PROGRESS" : "COMPLETED" }));
  fireEvent.click(screen.getByRole("button", { name: "Record production" }));
  await screen.findByText("Production recorded");
  expect(mocks.action).toHaveBeenLastCalledWith("wo", expect.objectContaining({ action: "complete", producedQuantity: 10, measuredWeight: 4, idempotencyKey: expect.any(String) }));
});
it("resumes a failed completion without creating or releasing another batch", async () => {
  await prepare();
  mocks.fetch.mockResolvedValue({ ...draft, status: "IN_PROGRESS" });
  mocks.action.mockRejectedValueOnce(new Error("Connection interrupted"));
  fireEvent.click(screen.getByRole("button", { name: "Record production" }));
  await screen.findByRole("alert");
  const key = mocks.action.mock.calls[0][1].idempotencyKey;
  mocks.action.mockResolvedValue({ ...draft, status: "COMPLETED" });
  fireEvent.click(screen.getByRole("button", { name: "Record production" }));
  await waitFor(() => expect(mocks.action).toHaveBeenCalledTimes(2));
  expect(mocks.action.mock.calls[1][1]).toMatchObject({ action: "complete", idempotencyKey: key });
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
