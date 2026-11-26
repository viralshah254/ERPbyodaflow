import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import MasterWarehousesPage from "./page";

const stores = [
  { id: "a", code: "FG", name: "Finished Goods", status: "ACTIVE", purpose: "STORAGE", capabilities: [] },
  { id: "b", code: "WIP", name: "Work in Progress", status: "ACTIVE", capabilities: [] },
  { id: "c", code: "DMG", name: "Damaged Dispatch", status: "ACTIVE", purpose: "QUARANTINE", dispositionPending: "DAMAGED", capabilities: [] },
];

const fetchWarehouseCatalogueApi = vi.hoisted(() => vi.fn(async (query: { search?: string; view: string }) => {
  let items = stores;
  if (query.view === "active") items = stores.filter((row) => row.status !== "INACTIVE");
  if (query.view === "purpose") items = stores.filter((row) => row.status !== "INACTIVE" && !row.purpose);
  if (query.view === "approval") items = stores.filter((row) => row.dispositionPending);
  const q = query.search?.trim().toLowerCase() ?? "";
  if (q) items = items.filter((row) => [row.code, row.name].some((value) => value.toLowerCase().includes(q)));
  return {
    items,
    total: items.length,
    counts: { all: stores.length, active: stores.length, purpose: 1, approval: 1 },
  };
}));

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
  fetchWarehouseCatalogueApi,
  fetchWarehouseApi: vi.fn(),
  mapWarehouseRow: (row: unknown) => row,
}));

it("asks the server for each store filter and search", async () => {
  render(<MasterWarehousesPage />);
  expect(await screen.findByText("Finished Goods")).toBeVisible();
  expect(fetchWarehouseCatalogueApi).toHaveBeenCalledWith({ search: "", view: "all" });

  fireEvent.click(screen.getByRole("button", { name: /Awaiting approval 1/ }));
  await waitFor(() => expect(screen.queryByText("Finished Goods")).toBeNull());
  expect(screen.getByText("Damaged Dispatch")).toBeVisible();
  expect(fetchWarehouseCatalogueApi).toHaveBeenLastCalledWith({ search: "", view: "approval" });

  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "FG" } });
  expect(await screen.findByText("No matching stores")).toBeVisible();
  expect(fetchWarehouseCatalogueApi).toHaveBeenLastCalledWith({ search: "FG", view: "approval" });

  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  await waitFor(() => expect(fetchWarehouseCatalogueApi).toHaveBeenLastCalledWith({ search: "", view: "all" }));
  expect(screen.getByText("Finished Goods")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: /Need purpose 1/ }));
  await waitFor(() => expect(screen.queryByText("Damaged Dispatch")).toBeNull());
  expect(screen.getByText("Work in Progress")).toBeVisible();
  expect(fetchWarehouseCatalogueApi).toHaveBeenLastCalledWith({ search: "", view: "purpose" });
});
