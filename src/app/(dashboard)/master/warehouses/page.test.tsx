import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import MasterWarehousesPage from "./page";

vi.mock("@/components/layout/page-header", () => ({ PageHeader: () => null }));
vi.mock("@/components/layout/page-shell", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/layout/page-shell")>(),
  PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/components/masters/EntityDrawer", () => ({ EntityDrawer: () => null }));
vi.mock("@/components/warehouse/WarehouseDispositionActions", () => ({ WarehouseDispositionActions: () => null }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteInventory: () => false }));
vi.mock("@/stores/orgContextStore", () => ({ useTerminology: () => ({ warehouse: "Store" }) }));
vi.mock("@/lib/api/lookups", () => ({ fetchBranchOptions: async () => [] }));
vi.mock("@/lib/api/warehouses", () => ({
  fetchWarehousesApi: async () => [
    { id: "a", code: "FG", name: "Finished Goods", status: "ACTIVE", purpose: "STORAGE", capabilities: [] },
    { id: "b", code: "WIP", name: "Work in Progress", status: "ACTIVE", capabilities: [] },
    { id: "c", code: "DMG", name: "Damaged Dispatch", status: "ACTIVE", purpose: "QUARANTINE", dispositionPending: "DAMAGED", capabilities: [] },
  ],
  mapWarehouseRow: (row: unknown) => row,
}));

it("filters stores by review status and clears a search with no matches", async () => {
  render(<MasterWarehousesPage />);
  expect(await screen.findByText("Finished Goods")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Awaiting approval 1/ }));
  expect(screen.getByText("Damaged Dispatch")).toBeVisible();
  expect(screen.queryByText("Finished Goods")).toBeNull();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "FG" } });
  expect(screen.getByText("No matching stores")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByText("Finished Goods")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Need purpose 1/ }));
  expect(screen.getByText("Work in Progress")).toBeVisible();
  expect(screen.queryByText("Damaged Dispatch")).toBeNull();
});
