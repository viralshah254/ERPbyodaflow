import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { JoyLoaderNote, JoyRouteLoads } from "./JoyRouteLoads";

const location = vi.hoisted(() => ({ search: "" }));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
const access = vi.hoisted(() => ({ write: false }));
const api = vi.hoisted(() => ({
  waiting: [] as Array<{
    warehouseId: string;
    warehouseName: string;
    sourceWarehouseId?: string;
    sourceWarehouseName?: string;
    orderCount: number;
    orders: Array<{ id: string; number: string; customerName: string; branchName: string; orderedAt?: string; lines: [] }>;
    products: Array<{ productId: string; sku?: string; name: string; orderedQty: number }>;
    salesReps?: Array<{ id: string; name: string; phone?: string }>;
  }>,
  notes: [] as Array<Record<string, unknown>>,
  trucks: [] as string[],
  allocate: vi.fn(),
  create: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(location.search),
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useHasPermission: () => access.write }));
vi.mock("@/lib/api/joy-dispatch", () => ({
  fetchJoyLoadNotes: async () => ({
    notes: api.notes,
    waiting: api.waiting,
    trucks: api.trucks,
    busyTrucks: [],
    dispatchWarehouseName: "DISPATCH - DISPATCH WAREHOUSE",
    dispatchWarehouseId: "dispatch-1",
    stores: [{ id: "dispatch-1", name: "DISPATCH - DISPATCH WAREHOUSE" }],
  }),
  setJoyRouteSourceStore: vi.fn().mockResolvedValue({ moved: 1 }),
  allocateJoyLoad: (...args: unknown[]) => api.allocate(...args),
  createJoyLoadNote: (...args: unknown[]) => api.create(...args),
}));
vi.mock("@/lib/api/sfa-sales-reps", () => ({
  fetchSfaSalesReps: vi.fn().mockResolvedValue({ reps: [], areas: [] }),
  createSfaSalesRep: vi.fn(),
}));
afterEach(() => {
  cleanup();
  location.search = "";
  access.write = false;
  api.waiting = [];
  api.notes = [];
  api.allocate.mockReset();
  api.create.mockReset();
  api.trucks = [];
  navigation.push.mockReset();
});

it("keeps dispatch steps out of the finance queue", async () => {
  location.search = "step=finance";
  render(<JoyRouteLoads />);
  expect(await screen.findByRole("heading", { name: "Loads awaiting finance" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Choose a truck" })).toBeNull();
  expect(screen.getByRole("link", { name: "Dispatch" })).toHaveAttribute("href", "?step=dispatch");
});

it("puts the sales-order route first without scrolling the app shell", async () => {
  const scroll = vi.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  location.search = "warehouse=meru";
  api.waiting = [
    {
      warehouseId: "other",
      warehouseName: "OTHER - OTHER",
      orderCount: 1,
      orders: [{ id: "so-1", number: "500001", customerName: "Shop", branchName: "", lines: [] }],
      products: [{ productId: "p1", sku: "29", name: "JOY SUPER BITES MANDAZI (180 GMS)", orderedQty: 1011 }],
    },
    {
      warehouseId: "meru",
      warehouseName: "MERU - EMBU",
      orderCount: 1,
      orders: [{ id: "so-2", number: "500013", customerName: "Shop", branchName: "", lines: [] }],
      products: [{ productId: "p2", sku: "1", name: "JOY QUEEN CAKES 4PCS (135 GMS)", orderedQty: 12 }],
    },
  ];
  render(<JoyRouteLoads />);
  const headings = await screen.findAllByRole("heading", { level: 3 });
  expect(headings.map((heading) => heading.textContent)).toEqual(["MERU - EMBU", "OTHER"]);
  expect(screen.getByText(/MERU - EMBU is first, from the sales order/)).toBeVisible();
  expect(scroll).not.toHaveBeenCalled();
});

it("lists a finance truck with its note, plate, route, and created time", async () => {
  location.search = "step=finance";
  api.notes = [{
    id: "n1",
    number: "LDN-0006",
    date: "2026-11-17T13:12:00.000Z",
    createdAt: "2026-11-17T13:12:00.000Z",
    loadedAt: "2026-11-17T13:18:00.000Z",
    status: "AWAITING_FINANCE",
    truck: "KBT 749H",
    routeWarehouseId: "meru",
    routeWarehouseName: "MERU - EMBU",
    fulfilmentWarehouseName: "DISPATCH",
    salesOrderIds: ["so-2"],
    lines: [{
      productId: "p2",
      sku: "1",
      name: "JOY QUEEN CAKES 4PCS (135 GMS)",
      unit: "EA",
      orderedQty: 12,
      loadedQty: 12,
      allocations: [{
        salesOrderId: "so-2",
        salesOrderNumber: "500013",
        customerName: "Naivas Embu",
        branchName: "Embu",
        lineId: "l1",
        orderedQty: 12,
        invoiceQty: 12,
      }],
    }],
    results: [],
  }];
  render(<JoyRouteLoads />);
  expect(await screen.findByText("LDN-0006")).toBeVisible();
  expect(screen.getByText("KBT 749H")).toBeVisible();
  expect(screen.getByText("MERU - EMBU")).toBeVisible();
  const created = new Date("2026-11-17T13:12:00.000Z");
  const createdLabel = `${created.toLocaleString(undefined, { day: "numeric", month: "short" })} · ${created.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  expect(screen.getByText(createdLabel)).toBeVisible();
  expect(screen.getByRole("link", { name: "Open loader note" })).toHaveAttribute("href", "/warehouse/route-pick-lists/n1");
  expect(screen.queryByRole("button", { name: "Confirm loader note" })).toBeNull();
});

it("shows the order and customer on the loader note page", async () => {
  api.notes = [{
    id: "n1",
    number: "LDN-0006",
    date: "2026-11-17T13:12:00.000Z",
    createdAt: "2026-11-17T13:12:00.000Z",
    loadedAt: "2026-11-17T13:18:00.000Z",
    status: "AWAITING_FINANCE",
    truck: "KBT 749H",
    routeWarehouseId: "meru",
    routeWarehouseName: "MERU - EMBU",
    fulfilmentWarehouseName: "DISPATCH",
    salesOrderIds: ["so-2"],
    lines: [{
      productId: "p2",
      sku: "1",
      name: "JOY QUEEN CAKES 4PCS (135 GMS)",
      unit: "EA",
      orderedQty: 12,
      loadedQty: 12,
      allocations: [{
        salesOrderId: "so-2",
        salesOrderNumber: "500013",
        customerName: "Naivas Embu",
        branchName: "Embu",
        lineId: "l1",
        orderedQty: 12,
        invoiceQty: 12,
      }],
    }],
    results: [],
  }];
  render(<JoyLoaderNote noteId="n1" />);
  expect(await screen.findByRole("link", { name: "500013" })).toHaveAttribute("href", "/docs/sales-order/so-2");
  expect(screen.getByText("Naivas Embu")).toBeVisible();
  expect(screen.getByRole("heading", { name: "KBT 749H" })).toBeVisible();
});

it("offers a delivery note only beside an invoice and delivery note on a full finance load", async () => {
  access.write = true;
  location.search = "step=finance";
  api.notes = [{
    id: "n1",
    number: "LDN-0005",
    date: "2026-11-13T07:26:00.000Z",
    status: "AWAITING_FINANCE",
    truck: "KCS 190N",
    routeWarehouseId: "kajiado",
    routeWarehouseName: "KAJIADO",
    fulfilmentWarehouseName: "DISPATCH",
    salesOrderIds: ["so-12"],
    lines: [{
      productId: "p2",
      name: "JOY QUEEN CAKES 4PCS (135 GMS)",
      unit: "EA",
      orderedQty: 12,
      loadedQty: 12,
      allocations: [{
        salesOrderId: "so-12",
        salesOrderNumber: "S00012",
        customerName: "NAIVAS LIMITED",
        branchName: "Headquarters",
        lineId: "l1",
        orderedQty: 12,
        invoiceQty: 12,
      }],
    }],
    results: [],
  }];
  api.notes[0].results = [{ salesOrderId: "so-12", deliveryNoteId: "dn-9", deliveryNoteNumber: "DN9" }];
  render(<JoyLoaderNote noteId="n1" />);
  expect(await screen.findByRole("button", { name: "Invoice and delivery note" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Continue delivery note" })).toBeEnabled();
});

const financeLoad = {
  id: "n1",
  number: "LDN-0004",
  date: "2026-11-13T07:20:00.000Z",
  status: "AWAITING_FINANCE",
  truck: "KCT 981Q",
  routeWarehouseId: "town",
  routeWarehouseName: "TOWN",
  fulfilmentWarehouseName: "DISPATCH",
  salesOrderIds: ["so-811"],
  lines: [{
    productId: "p1",
    sku: "1",
    name: "JOY QUEEN CAKES 4PCS (135 GMS)",
    unit: "PACK",
    orderedQty: 50,
    loadedQty: 50,
    allocations: [{
      salesOrderId: "so-811",
      salesOrderNumber: "S00811",
      customerName: "NAIVAS LIMITED",
      branchName: "Headquarters",
      lineId: "l1",
      orderedQty: 50,
      invoiceQty: 50,
    }],
  }],
  results: [],
};

it("opens the delivery note after finance creates one", async () => {
  access.write = true;
  location.search = "step=finance";
  api.notes = [financeLoad];
  api.allocate.mockResolvedValue({
    ...financeLoad,
    status: "INVOICED",
    documentPlan: "delivery_note",
    results: [{ salesOrderId: "so-811", deliveryNoteId: "dn-1", deliveryNoteNumber: "DN1", stockIssued: true }],
  });
  render(<JoyLoaderNote noteId="n1" />);
  fireEvent.click(await screen.findByRole("button", { name: "Confirm loader note" }));
  await waitFor(() => expect(api.allocate).toHaveBeenCalled());
  expect(navigation.push).not.toHaveBeenCalled();
});

it("opens the invoice after finance creates the invoice and delivery note", async () => {
  access.write = true;
  location.search = "step=finance";
  api.notes = [{
    ...financeLoad,
    results: [{ salesOrderId: "so-811", invoiceId: "inv-old", invoiceNumber: "INV0" }],
  }];
  api.allocate.mockResolvedValue({
    ...financeLoad,
    status: "INVOICED",
    documentPlan: "both",
    results: [{
      salesOrderId: "so-811",
      invoiceId: "inv-1",
      invoiceNumber: "INV1",
      deliveryNoteId: "dn-1",
      deliveryNoteNumber: "DN1",
      stockIssued: true,
    }],
  });
  render(<JoyLoaderNote noteId="n1" />);
  fireEvent.click(await screen.findByRole("button", { name: "Continue invoice and delivery note" }));
  await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/docs/invoice/inv-1"));
});

it("opens dispatch by default and links to Finance Review", async () => {
  location.search = "";
  render(<JoyRouteLoads />);
  expect(await screen.findByRole("heading", { name: "Choose a truck" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Loads awaiting finance" })).toBeNull();
  expect(screen.getByRole("link", { name: /Finance Review/ })).toHaveAttribute("href", "?step=finance");
});

it("starts a route's loader note with the reps on its orders and sends them when the note is created", async () => {
  access.write = true;
  api.trucks = ["KDA 123A"];
  api.waiting = [{
    warehouseId: "meru",
    warehouseName: "MERU - EMBU",
    sourceWarehouseId: "dispatch-1",
    sourceWarehouseName: "DISPATCH - DISPATCH WAREHOUSE",
    orderCount: 1,
    orders: [{ id: "so-2", number: "500013", customerName: "Shop", branchName: "", lines: [] }],
    products: [{ productId: "p2", sku: "1", name: "JOY QUEEN CAKES 4PCS (135 GMS)", orderedQty: 12 }],
    salesReps: [{ id: "sfa-ann", name: "Ann Wanjiku", phone: "+254711000001" }, { id: "sfa-ben", name: "Ben Otieno" }],
  }];
  api.create.mockResolvedValue({ id: "note-1", number: "LN-1", truck: "KDA 123A" });
  const user = userEvent.setup();
  render(<JoyRouteLoads />);
  const reps = await screen.findByRole("list", { name: "Chosen sales reps" });
  expect(reps).toHaveTextContent("Ann Wanjiku");
  fireEvent.click(screen.getByRole("button", { name: "Remove Ben Otieno" }));
  await user.click(document.getElementById("load-truck-meru")!);
  await waitFor(() => expect(screen.getByRole("button", { name: "KDA 123A" })).toBeVisible());
  await user.click(screen.getByRole("button", { name: "KDA 123A" }));
  fireEvent.click(screen.getByRole("button", { name: "Create loading note" }));
  await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
    warehouseId: "meru", truck: "KDA 123A", salesRepIds: ["sfa-ann"],
  })));
});
