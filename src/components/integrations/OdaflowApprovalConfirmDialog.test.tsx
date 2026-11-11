import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { OdaflowApprovalConfirmDialog } from "./OdaflowApprovalConfirmDialog";

it("keeps request approval locked until a route warehouse is selected", () => {
  render(
    <OdaflowApprovalConfirmDialog
      open
      onOpenChange={() => {}}
      confirmLabel="Request approval"
      intent="submit"
      onConfirm={() => {}}
      routeWarehouse={{ options: [{ id: "west", label: "Westlands" }], value: "", onChange: () => {} }}
    />
  );
  expect(screen.getByRole("button", { name: "Request approval" })).toBeDisabled();
  expect(screen.getByText("Route warehouse")).toBeInTheDocument();
});

it("unlocks request approval after the route warehouse is selected", () => {
  render(
    <OdaflowApprovalConfirmDialog
      open
      onOpenChange={() => {}}
      confirmLabel="Request approval"
      intent="submit"
      onConfirm={() => {}}
      routeWarehouse={{ options: [{ id: "west", label: "Westlands" }], value: "west", onChange: () => {} }}
    />
  );
  expect(screen.getByRole("button", { name: "Request approval" })).toBeEnabled();
});
