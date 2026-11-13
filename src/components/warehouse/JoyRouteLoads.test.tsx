import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JoyRouteLoads } from "./JoyRouteLoads";

const location = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(location.search) }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useHasPermission: () => false }));
vi.mock("@/lib/api/joy-dispatch", () => ({
  fetchJoyLoadNotes: async () => ({ notes: [], waiting: [], trucks: [], busyTrucks: [], dispatchWarehouseName: "Dispatch" }),
}));
afterEach(cleanup);

it("keeps dispatch steps out of the finance queue", async () => {
  location.search = "step=finance";
  render(<JoyRouteLoads />);
  expect(await screen.findByRole("heading", { name: "Loads awaiting finance" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Choose a truck" })).toBeNull();
  expect(screen.getByRole("link", { name: "Dispatch" })).toHaveAttribute("href", "?step=dispatch");
});

it("opens dispatch by default and links to Finance Review", async () => {
  location.search = "";
  render(<JoyRouteLoads />);
  expect(await screen.findByRole("heading", { name: "Choose a truck" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Loads awaiting finance" })).toBeNull();
  expect(screen.getByRole("link", { name: /Finance Review/ })).toHaveAttribute("href", "?step=finance");
});
