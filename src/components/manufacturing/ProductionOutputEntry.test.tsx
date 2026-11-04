import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), fetch: vi.fn(), action: vi.fn(), preview: vi.fn() }));
vi.mock("@/components/layout/page-shell", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: () => <h1>Record production</h1> }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteManufacturing: () => true }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (s: object) => unknown) => select({ org: { orgId: "joy" } }) }));
vi.mock("@/lib/api/warehouses", () => ({ fetchWarehousesApi: async () => [{ id: "raw", name: "Raw materials" }, { id: "finished", name: "Finished goods" }] }));
vi.mock("@/lib/api/manufacturing", () => ({
  fetchProductionPlanDefaults: async () => ({ items: [{ productId: "cake", productName: "Cake", uom: "EA" }] }),
  previewProductionOutput: mocks.preview, createManufacturingWorkOrder: mocks.create, fetchManufacturingWorkOrder: mocks.fetch, runManufacturingWorkOrderAction: mocks.action,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
import { ProductionOutputEntry } from "./ProductionOutputEntry";
const draft = { id: "wo", number: "WO-1", status: "DRAFT", quantity: 10, materialLines: [{ lineId: "flour", productName: "Flour", plannedQuantity: 2, uom: "KG", warehouseId: "raw" }], outputLines: [] };
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); sessionStorage.clear(); mocks.create.mockResolvedValue({ id: "wo" }); mocks.fetch.mockResolvedValue(draft); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const preview = { inputWarehouseIds: ["raw"], outputWarehouseId: "finished", materialLines: draft.materialLines, outputLines: [{ warehouseName: "Finished goods" }], shortages: [], reviewSignature: "review" };
vi.mock("@/components/ui/combobox", () => ({ Combobox: ({ value, onChange, options, disabled }: { value: string; onChange: (s: string) => void; options: { value: string; label: string }[]; disabled: boolean }) => <select aria-label="Finished product" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}><option value="">Choose</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select> }));
async function prepare() {
  mocks.preview.mockResolvedValue(preview);
  render(<ProductionOutputEntry />);
  await screen.findByRole("option", { name: /Cake/ });
  fireEvent.change(screen.getByRole("combobox", { name: "Finished product" }), { target: { value: "cake" } });
  fireEvent.change(screen.getByLabelText(/^Quantity/), { target: { value: "10" } });
  await screen.findByText("Flour");
}
it("previews without creating stock records and posts count-only from one action", async () => {
  await prepare();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.preview).toHaveBeenCalledWith("cake", 10);
  mocks.action.mockImplementation(async (_id, { action }) => ({ ...draft, status: action === "release" ? "RELEASED" : action === "start" ? "IN_PROGRESS" : "COMPLETED" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve and post" }));
  await screen.findByText("Production posted");
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 10, inputWarehouseIds: ["raw"], outputWarehouseId: "finished", measurementMode: "COUNT_ONLY", weighingRequired: false, reviewSignature: "review" }));
  expect(mocks.action).toHaveBeenLastCalledWith("wo", { action: "complete", producedQuantity: 10, idempotencyKey: expect.any(String) });
});
it("resumes a failed completion without creating or releasing another batch", async () => {
  await prepare();
  mocks.fetch.mockResolvedValue({ ...draft, status: "IN_PROGRESS" });
  mocks.action.mockRejectedValueOnce(new Error("Connection interrupted"));
  fireEvent.click(screen.getByRole("button", { name: "Approve and post" }));
  await screen.findByRole("alert");
  const key = mocks.action.mock.calls[0][1].idempotencyKey;
  mocks.action.mockResolvedValue({ ...draft, status: "COMPLETED" });
  fireEvent.click(screen.getByRole("button", { name: "Approve and post" }));
  await screen.findByText("Production posted");
  expect(mocks.action.mock.calls[1][1]).toMatchObject({ action: "complete", idempotencyKey: key });
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it("blocks approval for stock shortages", async () => {
  await prepare();
  fireEvent.change(screen.getByLabelText(/^Quantity/), { target: { value: "20" } });
  mocks.preview.mockResolvedValue({ ...preview, shortages: ["Flour shortage"] });
  await screen.findByText("Flour shortage");
  expect(screen.getByRole("button", { name: "Approve and post" }).hasAttribute("disabled")).toBe(true);
  expect(mocks.create).not.toHaveBeenCalled();
});
