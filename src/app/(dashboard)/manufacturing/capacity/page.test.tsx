import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
const mocks = vi.hoisted(() => ({ load: vi.fn(), preview: vi.fn(), reserve: vi.fn(), detail: vi.fn() }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ org: { orgId: "synthetic" }, permissions: ["manufacturing.workorders.read", "manufacturing.production.write"], branches: [{ branchId: "branch", name: "Main bakery" }] }) }));
vi.mock("@/lib/api/production-controls", () => ({ fetchCapacityWorkspace: mocks.load, previewCapacityApi: mocks.preview, reserveCapacityApi: mocks.reserve, releaseCapacityApi: vi.fn() }));
vi.mock("@/lib/api/manufacturing", () => ({ fetchManufacturingWorkOrdersPage: vi.fn(), fetchManufacturingWorkOrder: mocks.detail }));
vi.mock("@/components/ui/async-searchable-select", () => ({ AsyncSearchableSelect: ({ onValueChange }: { onValueChange: (id: string) => void }) => <button type="button" onClick={() => onValueChange("wo-cake")}>Select synthetic cake batch</button> }));
vi.mock("@/components/layout/page-layout", () => ({ PageLayout: ({ title, children }: { title: string; children: React.ReactNode }) => <main className="mx-auto min-h-screen max-w-[1500px] bg-background p-4 text-foreground sm:p-6"><p className="mb-2 text-xs text-muted-foreground">SYNTHETIC QA PREVIEW · NO CLIENT DATA</p><h1 className="mb-5 text-2xl font-semibold">{title}</h1>{children}</main> }));
import Page from "./page";
const resource = { _id: "oven", name: "Oven 1", branchId: "branch", workCenterKey: "baking", revision: 2, active: true, windows: [{ start: "2030-01-01T08:00:00Z", end: "2030-01-01T17:00:00Z" }] };
const slot = { operationId: "bake", operationName: "Bake", resourceId: "oven", resourceName: "Oven 1", start: "2030-01-01T09:00:00Z", end: "2030-01-01T10:30:00Z" };
beforeEach(() => { vi.clearAllMocks(); mocks.load.mockResolvedValue({ contract: "finite-capacity-v1", resources: [resource], reservations: [{ ...slot, _id: "booking", workOrderId: "wo-bread", state: "RESERVED" }], basis: "Finite availability" }); mocks.detail.mockResolvedValue({ id: "wo-cake", number: "WO-CAKE-001", productName: "Queen cakes", quantity: 100, routingSnapshot: { operations: [{ operationId: "bake", name: "Bake", workCenterId: "baking", order: 1 }] } }); mocks.preview.mockResolvedValue({ digest: "frozen-preview", slots: [slot], quantity: 100, workOrderId: "wo-cake" }); });
afterEach(cleanup);
it("requires a reviewed preview before reserving and invalidates it when the form changes", async () => {
  const view = render(<Page/>);
  await screen.findByText("Reserved production time");
  fireEvent.click(screen.getByRole("button", { name: "Select synthetic cake batch" }));
  await screen.findByText("Work centre: baking");
  fireEvent.change(screen.getByLabelText("Start no earlier than"), { target: { value: "2030-01-01T08:00" } });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "oven" } });
  fireEvent.click(screen.getByRole("button", { name: "Preview available slots" }));
  await screen.findByRole("button", { name: "Reserve reviewed schedule" });
  expect(mocks.reserve).not.toHaveBeenCalled();
  if (process.env.ERP_UI_EVIDENCE === "1") { mkdirSync("/private/tmp/erp-wave1-ui", { recursive: true }); writeFileSync("/private/tmp/erp-wave1-ui/capacity.html", `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="styles.css"></head><body>${view.container.innerHTML.replace('<option value="oven">', '<option value="oven" selected>')}</body></html>`); }
  fireEvent.change(screen.getByLabelText("Start no earlier than"), { target: { value: "2030-01-02T08:00" } });
  expect(screen.queryByRole("button", { name: "Reserve reviewed schedule" })).not.toBeInTheDocument();
});
it("shows an availability error without inventing a healthy empty calendar", async () => {
  mocks.load.mockRejectedValue(new Error("Availability service unavailable")); render(<Page/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Availability service unavailable");
  expect(screen.queryByText("No reservations on this resource.")).not.toBeInTheDocument();
});
