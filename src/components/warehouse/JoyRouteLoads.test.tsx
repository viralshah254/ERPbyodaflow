import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JoyRouteLoads } from "./JoyRouteLoads";

const location = vi.hoisted(() => ({ search: "" }));
const api = vi.hoisted(() => ({
  waiting: [] as Array<{
    warehouseId: string;
    warehouseName: string;
    orderCount: number;
    orders: Array<{ id: string; number: string; customerName: string; branchName: string; lines: [] }>;
    products: Array<{ productId: string; sku?: string; name: string; orderedQty: number }>;
  }>,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(location.search) }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useHasPermission: () => false }));
vi.mock("@/lib/api/joy-dispatch", () => ({
  fetchJoyLoadNotes: async () => ({
    notes: [],
    waiting: api.waiting,
    trucks: [],
    busyTrucks: [],
    dispatchWarehouseName: "DISPATCH - DISPATCH WAREHOUSE",
  }),
}));
afterEach(() => {
  cleanup();
  location.search = "";
  api.waiting = [];
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

it("opens dispatch by default and links to Finance Review", async () => {
  location.search = "";
  render(<JoyRouteLoads />);
  expect(await screen.findByRole("heading", { name: "Choose a truck" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Loads awaiting finance" })).toBeNull();
  expect(screen.getByRole("link", { name: /Finance Review/ })).toHaveAttribute("href", "?step=finance");
});
