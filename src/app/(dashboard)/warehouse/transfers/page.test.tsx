import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import NewTransferPage from "./new/page";
import { createTransfer, fetchTransferStock } from "@/lib/api/warehouse-transfers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ actions }: { actions: React.ReactNode }) => <header>{actions}</header> }));
vi.mock("@/components/layout/page-shell", () => ({ LIST_PAGE_SHELL_CLASS: "", LIST_PAGE_BODY_CLASS: "", LIST_TABLE_SURFACE_CLASS: "", PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/copilot/ExplainThis", () => ({ ExplainThis: () => null }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteInventory: () => true }));
vi.mock("@/lib/api/warehouse-transfers", () => ({ createTransfer: vi.fn().mockResolvedValue({ id: "draft-1" }), fetchTransferStock: vi.fn() }));
vi.mock("@/lib/api/lookups", () => ({ fetchWarehouseOptions: vi.fn().mockResolvedValue([{ id: "source", label: "Finished Goods" }, { id: "destination", label: "Dispatch" }, { id: "choco", label: "CHOCO", transferSourceBlock: "Needs classification" }]) }));
vi.mock("@/lib/api/product-master", () => ({ fetchProductPackagingApi: vi.fn().mockResolvedValue([]) }));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void }) => {
    const [trigger, content] = React.Children.toArray(children) as React.ReactElement<{ id?: string; children?: React.ReactNode; "aria-label"?: string }>[];
    return <select id={trigger?.props.id} aria-label={trigger?.props["aria-label"]} value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      <option value="">Select</option>
      {content?.props.children}
    </select>;
  },
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: ({ value, children, disabled }: { value: string; children: React.ReactNode; disabled?: boolean }) => <option disabled={disabled} value={value}>{children}</option>,
}));

afterEach(cleanup);

it("shows source availability beside quantity and blocks a draft over available stock", async () => {
  vi.mocked(fetchTransferStock).mockResolvedValue([{ productId: "p", sku: "SKU-072", name: "Soap", uom: "PCS", quantity: 2, reserved: 1, available: 1 }]);
  render(<NewTransferPage />);
  expect((await screen.findAllByRole("option", { name: "CHOCO · Needs classification" }))[0]).toBeDisabled();
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  fireEvent.change(screen.getByLabelText("To warehouse"), { target: { value: "destination" } });
  const quantity = await screen.findByRole("spinbutton", { name: "Quantity for Soap SKU-072" });
  fireEvent.change(quantity, { target: { value: "2" } });
  expect(quantity).toHaveAttribute("aria-invalid", "true");
  expect(quantity).toHaveAccessibleDescription(/1 PCS.*2 on hand.*1 reserved.*Reduce by 1 PCS/);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  fireEvent.change(quantity, { target: { value: "1" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Search source stock" }), { target: { value: "missing" } });
  expect(screen.queryByRole("spinbutton", { name: "Quantity for Soap SKU-072" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(createTransfer).toHaveBeenCalledWith(expect.objectContaining({
    fromWarehouseId: "source",
    toWarehouseId: "destination",
    lines: [{ productId: "p", sku: "SKU-072", productName: "Soap", quantity: 1, unit: "PCS" }],
  })));
});

it("shows the API rejection reason and leaves draft creation disabled", async () => {
  vi.mocked(fetchTransferStock).mockRejectedValueOnce(new Error("Select an active, usable source warehouse."));
  render(<NewTransferPage />);
  await screen.findAllByRole("option", { name: "Finished Goods" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Select an active, usable source warehouse.");
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
});
