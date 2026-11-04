import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ defaults: vi.fn(), explode: vi.fn(), apply: vi.fn(), print: vi.fn() }));
vi.mock("@/components/layout/page-shell", () => ({ PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, LIST_TABLE_WORKLIST_CLASS: "" }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: () => <h1>Production plan</h1> }));
vi.mock("@/components/operational/OperationalFlowNav", () => ({ OperationalFlowNav: () => null }));
vi.mock("@/stores/orgContextStore", () => ({ useTerminology: () => ({}), useOrgContextStore: (select: (s: object) => unknown) => select({ templateId: "bakex", industryCategory: "FMCG" }) }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteManufacturing: () => true }));
vi.mock("@/lib/api/manufacturing", () => ({ fetchProductionPlanDefaults: mocks.defaults, explodeProductionPlan: mocks.explode, applyProductionPlan: mocks.apply, fetchManufacturingWorkOrder: vi.fn() }));
vi.mock("@/lib/manufacturing/production-sheet", () => ({ printProductionPlan: mocks.print, printDailyProductionPacket: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
import ProductionPlanPage from "./page";
const cake = { productId: "cake", productName: "Queen cakes", productSku: "Q4", uom: "EA", requiredQty: 0, onHandQty: 0, incomingQty: 0, shortageQty: 0 };
const other = { ...cake, productId: "bread", productName: "Bread", productSku: "BR" };
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks(); sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  mocks.defaults.mockImplementation(async ({ search }: { search?: string }) => ({ items: search ? [other] : [cake], totalCount: 1, hasMore: false }));
  mocks.explode.mockResolvedValue({ packLines: [{ ...cake, requiredQty: 10 }], make: [], buy: [{ productId: "flour", productName: "Wheat flour", uom: "KG", requiredQty: 2, onHandQty: 5, shortageQty: 0, warehouseShortfallQty: 0 }], tree: [{ productId: "flour", productName: "Wheat flour", uom: "KG", quantity: 2, kind: "buy", children: [] }] });
  mocks.apply.mockResolvedValue({ created: [], explode: { packLines: [], make: [], buy: [], tree: [] } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("production planning operator flow", () => {
  it("keeps entered quantities through catalogue search and calculates before creating weighed drafts", async () => {
    render(<ProductionPlanPage />);
    const quantity = await screen.findByRole("spinbutton", { name: "Pack quantity for Queen cakes" });
    expect(screen.getByRole("button", { name: "Create draft work orders" })).toBeDisabled();
    fireEvent.change(quantity, { target: { value: "10" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Search finished products by SKU or name" }), { target: { value: "Bread" } });
    await screen.findByRole("spinbutton", { name: "Pack quantity for Bread" });
    fireEvent.click(screen.getByRole("button", { name: "Work backwards" }));
    await screen.findByRole("heading", { name: "Total formula & material requirements" });
    expect(mocks.explode).toHaveBeenCalledWith([{ productId: "cake", quantity: 10 }]);
    // Materials on hand must still appear in the full requirements, even when nothing needs buying.
    expect(screen.getAllByText("Wheat flour").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Print / save plan PDF" }));
    expect(mocks.print).toHaveBeenCalledWith(expect.objectContaining({ buy: expect.any(Array) }), expect.any(Date));
    fireEvent.change(screen.getByLabelText("Verification for new batches"), { target: { value: "MANUAL_SCALE" } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft work orders" }));
    await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith([{ productId: "cake", quantity: 10 }], expect.any(String), "MANUAL_SCALE"));
  });
  it("invalidates calculated requirements when an output quantity changes", async () => {
    render(<ProductionPlanPage />);
    fireEvent.change(await screen.findByRole("spinbutton", { name: "Pack quantity for Queen cakes" }), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Work backwards" }));
    await screen.findByRole("heading", { name: "Total formula & material requirements" });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Pack quantity for Queen cakes" }), { target: { value: "11" } });
    expect(screen.getByRole("button", { name: "Create draft work orders" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Print / save plan PDF" })).not.toBeInTheDocument();
    expect(mocks.apply).not.toHaveBeenCalled();
  });
});
