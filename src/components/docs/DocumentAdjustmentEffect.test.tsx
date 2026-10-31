import * as React from "react";
import { render, cleanup } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ patch: vi.fn(), warehouses: vi.fn() }));
vi.mock("@/lib/api/documents", () => ({ patchDocumentApi: mocks.patch }));
vi.mock("@/lib/api/lookups", () => ({ fetchWarehouseOptions: mocks.warehouses }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { DocumentAdjustmentEffect } from "./DocumentAdjustmentEffect";
import type { DocumentDetailRecord } from "@/lib/types/documents";
const doc = { id: "note", type: "credit-note", status: "DRAFT", stockAccountingVersion: 1, companyAverageCosting: true } as DocumentDetailRecord;
afterEach(cleanup);
beforeEach(() => { mocks.patch.mockReset().mockResolvedValue({}); mocks.warehouses.mockResolvedValue([{ id: "raw", label: "Raw materials" }]); });
describe("adjustment stock effect", () => {
  it("does not offer a write against an older backend", () => {
    render(<DocumentAdjustmentEffect document={{ ...doc, stockAccountingVersion: undefined }} canEdit onSaved={async () => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/Update the connected backend/)).toBeTruthy();
  });
  it("saves a price-only correction without issuing stock", async () => {
    const saved = vi.fn().mockResolvedValue(undefined);
    render(<DocumentAdjustmentEffect document={doc} canEdit onSaved={saved} />);
    await userEvent.selectOptions(screen.getByLabelText("Adjustment stock effect"), "PRICE_DECREASE");
    await userEvent.click(screen.getByRole("button", { name: "Save stock effect" }));
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith("credit-note", "note", { adjustmentEffect: "PRICE_DECREASE" }));
    expect(saved).toHaveBeenCalledOnce();
  });
  it("requires a warehouse for a physical supplier return", async () => {
    render(<DocumentAdjustmentEffect document={{ ...doc, type: "purchase-credit-note" }} canEdit onSaved={async () => {}} />);
    await userEvent.selectOptions(screen.getByLabelText("Adjustment stock effect"), "SUPPLIER_RETURN");
    const button = screen.getByRole("button", { name: "Save stock effect" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await userEvent.selectOptions(screen.getByLabelText("Supplier return warehouse"), "raw");
    await userEvent.click(button);
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledWith("purchase-credit-note", "note", { adjustmentEffect: "SUPPLIER_RETURN", warehouseId: "raw" }));
  });
  it("keeps a posted note immutable", () => {
    render(<DocumentAdjustmentEffect document={{ ...doc, status: "POSTED", adjustmentEffect: "PHYSICAL_RETURN" }} canEdit onSaved={async () => {}} />);
    expect((screen.getByLabelText("Adjustment stock effect") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
