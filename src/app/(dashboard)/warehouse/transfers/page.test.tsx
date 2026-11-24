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
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/components/ui/async-searchable-select", () => ({
  AsyncSearchableSelect: ({ id, value, onValueChange, loadOptions, reloadToken }: {
    id?: string; value?: string; onValueChange: (id: string) => void; reloadToken?: unknown;
    loadOptions: (query: string) => Promise<Array<{ id: string; label: string; description?: string }>>;
  }) => {
    const [options, setOptions] = React.useState<Array<{ id: string; label: string; description?: string }>>([]);
    React.useEffect(() => {
      void loadOptions("").then(setOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadToken]);
    return <select id={id} value={value ?? ""} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">Select</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.description ? `${option.label} · ${option.description}` : option.label}</option>)}
    </select>;
  },
}));

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

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
});

it("shows source availability beside quantity and blocks a draft over available stock", async () => {
  vi.mocked(fetchTransferStock).mockResolvedValue([{ productId: "p", sku: "SKU-072", name: "Soap", uom: "PCS", quantity: 2, reserved: 1, available: 1 }]);
  render(<NewTransferPage />);
  await screen.findByRole("option", { name: "CHOCO · Needs classification" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "choco" } });
  expect(fetchTransferStock).not.toHaveBeenCalledWith("choco");
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

it("transfers in one step from an order, showing stock in both stores and what moved", async () => {
  vi.mocked(fetchTransferStock).mockImplementation(async (_from: string, to?: string) => [
    { productId: "p", sku: "SKU-072", name: "Soap", uom: "PCS", quantity: 40, reserved: 0, available: 40, ...(to ? { destination: { quantity: 5, available: 5 } } : {}) },
  ]);
  vi.mocked(createTransfer).mockResolvedValueOnce({ id: "t-1", number: "TRF-0009", status: "RECEIVED" });
  window.history.replaceState(null, "", "/warehouse/transfers/new?to=destination&line=p%3A12&return=order");
  render(<NewTransferPage />);
  await screen.findAllByRole("option", { name: "Finished Goods" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  expect(await screen.findByText("5 PCS")).toBeInTheDocument();
  expect(screen.getByText("→ 17 after")).toBeInTheDocument();
  expect(fetchTransferStock).toHaveBeenLastCalledWith("source", "destination");
  fireEvent.click(screen.getByRole("button", { name: "Transfer now" }));
  await waitFor(() => expect(createTransfer).toHaveBeenLastCalledWith(expect.objectContaining({
    post: true,
    fromWarehouseId: "source",
    toWarehouseId: "destination",
    lines: [{ productId: "p", sku: "SKU-072", productName: "Soap", quantity: 12, unit: "PCS" }],
  })));
  expect(await screen.findByRole("heading", { name: "Stock transferred" })).toBeInTheDocument();
  expect(screen.getByText("+12 PCS")).toBeInTheDocument();
  expect(screen.getByText("17 now at Dispatch")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Back to the order" })).toBeInTheDocument();
});

it("shows the API rejection reason and leaves draft creation disabled", async () => {
  vi.mocked(fetchTransferStock).mockRejectedValueOnce(new Error("Select an active, usable source warehouse."));
  render(<NewTransferPage />);
  await screen.findAllByRole("option", { name: "Finished Goods" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Select an active, usable source warehouse.");
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
});

it("opens from a finished batch with the output store, product and quantity already filled in", async () => {
  vi.mocked(fetchTransferStock).mockResolvedValue([
    { productId: "p", sku: "SKU-072", name: "Soap", uom: "PCS", quantity: 40, reserved: 0, available: 40 },
    { productId: "q", sku: "SKU-073", name: "Bread", uom: "PCS", quantity: 9, reserved: 0, available: 9 },
  ]);
  window.history.replaceState(null, "", "/warehouse/transfers/new?from=source&line=p%3A24&ref=WO-0007");
  render(<NewTransferPage />);
  expect(await screen.findByRole("spinbutton", { name: "Quantity for Soap SKU-072" })).toHaveValue(24);
  expect(fetchTransferStock).toHaveBeenCalledWith("source");
  expect(screen.queryByRole("spinbutton", { name: "Quantity for Bread SKU-073" })).toBeNull();
  expect(screen.getByLabelText("Reference (optional)")).toHaveValue("WO-0007");
  fireEvent.change(screen.getByLabelText("To warehouse"), { target: { value: "destination" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(createTransfer).toHaveBeenLastCalledWith(expect.objectContaining({
    fromWarehouseId: "source",
    toWarehouseId: "destination",
    reference: "WO-0007",
    lines: [{ productId: "p", sku: "SKU-072", productName: "Soap", quantity: 24, unit: "PCS" }],
  })));
});
