import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import WarehouseTransfersPage from "./page";
import { fetchTransferStock } from "@/lib/api/warehouse-transfers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ actions }: { actions: React.ReactNode }) => <header>{actions}</header> }));
vi.mock("@/components/layout/page-shell", () => ({ LIST_PAGE_SHELL_CLASS: "", LIST_PAGE_BODY_CLASS: "", LIST_TABLE_SURFACE_CLASS: "", PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/copilot/ExplainThis", () => ({ ExplainThis: () => null }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteInventory: () => true }));
vi.mock("@/lib/api/warehouse-transfers", () => ({ fetchTransfers: vi.fn().mockResolvedValue([]), fetchTransferStock: vi.fn() }));
vi.mock("@/lib/api/lookups", () => ({ fetchWarehouseOptions: vi.fn().mockResolvedValue([{ id: "source", label: "Finished Goods" }, { id: "destination", label: "Dispatch" }]) }));
vi.mock("@/lib/api/product-master", () => ({ fetchProductPackagingApi: vi.fn().mockResolvedValue([]) }));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void }) => {
    const [trigger, content] = React.Children.toArray(children) as React.ReactElement<{ id?: string; children?: React.ReactNode }>[];
    return <select id={trigger?.props.id} value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      <option value="">Select</option>
      {content?.props.children}
    </select>;
  },
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

it("shows source availability beside quantity and blocks a draft over available stock", async () => {
  vi.mocked(fetchTransferStock).mockResolvedValue([{ productId: "p", sku: "SKU-072", name: "Soap", uom: "PCS", quantity: 2, reserved: 1, available: 1 }]);
  render(<WarehouseTransfersPage />);
  fireEvent.click(screen.getByRole("button", { name: "Create transfer" }));
  await screen.findAllByRole("option", { name: "Finished Goods" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  fireEvent.change(screen.getByLabelText("To warehouse"), { target: { value: "destination" } });
  await waitFor(() => expect(screen.getByText("Select product").closest("button")!).toBeEnabled());
  fireEvent.click(screen.getByText("Select product").closest("button")!);
  fireEvent.click(await screen.findByRole("button", { name: "SKU-072 · Soap" }));
  const quantity = screen.getByRole("spinbutton", { name: "Quantity" });
  fireEvent.change(quantity, { target: { value: "2" } });
  expect(quantity).toHaveAttribute("aria-invalid", "true");
  expect(quantity).toHaveAccessibleDescription(/Only 1 PCS available.*Reduce by 1 PCS.*2 on hand.*1 reserved/);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  fireEvent.change(quantity, { target: { value: "1" } });
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
});
