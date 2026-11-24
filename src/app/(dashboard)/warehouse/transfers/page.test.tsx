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
  vi.mocked(fetchTransferStock).mockReset();
});

type StockRow = Awaited<ReturnType<typeof fetchTransferStock>>["items"][number];

/** Serves stock the way the API does: searched, limited to asked-for products, and paged. */
function serveStock(rows: (toWarehouseId?: string) => StockRow[]) {
  vi.mocked(fetchTransferStock).mockImplementation(async (query) => {
    let items = rows(query.toWarehouseId);
    if (query.productIds) items = items.filter((row) => query.productIds!.includes(row.productId));
    if (query.search) items = items.filter((row) => row.name.toLowerCase().includes(query.search!.toLowerCase()));
    const offset = query.offset ?? 0;
    return { items: items.slice(offset, offset + (query.limit ?? 25)), total: items.length, hasMore: offset + (query.limit ?? 25) < items.length };
  });
}

const soap = { productId: "p", sku: "SKU-072", name: "Soap", uom: "PCS", quantity: 2, reserved: 1, available: 1 };
const bread = { productId: "q", sku: "SKU-073", name: "Bread", uom: "PCS", quantity: 9, reserved: 0, available: 9 };

it("adds a product from search, checks it against available stock, and saves a draft", async () => {
  serveStock(() => [soap, bread]);
  render(<NewTransferPage />);
  await screen.findByRole("option", { name: "CHOCO · Needs classification" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "choco" } });
  expect(fetchTransferStock).not.toHaveBeenCalledWith(expect.objectContaining({ warehouseId: "choco" }));
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  fireEvent.change(screen.getByLabelText("To warehouse"), { target: { value: "destination" } });
  expect(await screen.findByText("2 products in stock")).toBeInTheDocument();
  expect(screen.queryByRole("spinbutton", { name: /Quantity for/ })).toBeNull();

  const search = screen.getByRole("combobox", { name: "Find a product to transfer" });
  fireEvent.change(search, { target: { value: "soa" } });
  fireEvent.click(await screen.findByRole("option", { name: /Soap/ }));
  expect(fetchTransferStock).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: "source", search: "soa", limit: 8 }));
  const quantity = await screen.findByRole("spinbutton", { name: "Quantity for Soap SKU-072" });
  expect(screen.queryByRole("spinbutton", { name: "Quantity for Bread SKU-073" })).toBeNull();
  fireEvent.change(quantity, { target: { value: "2" } });
  expect(quantity).toHaveAttribute("aria-invalid", "true");
  expect(quantity).toHaveAccessibleDescription(/1 PCS.*2 on hand.*1 reserved.*Reduce by 1 PCS/);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  fireEvent.change(quantity, { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(createTransfer).toHaveBeenCalledWith(expect.objectContaining({
    fromWarehouseId: "source",
    toWarehouseId: "destination",
    lines: [{ productId: "p", sku: "SKU-072", productName: "Soap", quantity: 1, unit: "PCS" }],
  })));
});

it("picks the first match when Enter is pressed, as a barcode scanner does, and removes a product", async () => {
  serveStock(() => [soap, bread]);
  render(<NewTransferPage />);
  await screen.findAllByRole("option", { name: "Finished Goods" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  const search = await screen.findByRole("combobox", { name: "Find a product to transfer" });
  await waitFor(() => expect(search).toBeEnabled());
  fireEvent.change(search, { target: { value: "bread" } });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(await screen.findByRole("spinbutton", { name: "Quantity for Bread SKU-073" })).toBeInTheDocument();
  expect(search).toHaveValue("");
  fireEvent.click(screen.getByRole("button", { name: "Remove Bread" }));
  expect(screen.queryByRole("spinbutton", { name: "Quantity for Bread SKU-073" })).toBeNull();
  expect(screen.getByText("No products added yet")).toBeInTheDocument();
});

it("adds several products at once from Browse", async () => {
  serveStock(() => [soap, bread]);
  render(<NewTransferPage />);
  await screen.findAllByRole("option", { name: "Finished Goods" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  const browse = await screen.findByRole("button", { name: "Browse" });
  await waitFor(() => expect(browse).toBeEnabled());
  fireEvent.click(browse);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Select Soap" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Bread" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 2 products" }));
  expect(await screen.findByRole("spinbutton", { name: "Quantity for Soap SKU-072" })).toBeInTheDocument();
  expect(screen.getByRole("spinbutton", { name: "Quantity for Bread SKU-073" })).toBeInTheDocument();
  expect(fetchTransferStock).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: "source", limit: 30 }));
});

it("transfers in one step from an order, showing stock in both stores and what moved", async () => {
  serveStock((to) => [{ ...soap, quantity: 40, reserved: 0, available: 40, ...(to ? { destination: { quantity: 5, available: 5 } } : {}) }]);
  vi.mocked(createTransfer).mockResolvedValueOnce({ id: "t-1", number: "TRF-0009", status: "RECEIVED" });
  window.history.replaceState(null, "", "/warehouse/transfers/new?to=destination&line=p%3A12&return=order");
  render(<NewTransferPage />);
  await screen.findAllByRole("option", { name: "Finished Goods" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  expect(await screen.findByText("5 PCS")).toBeInTheDocument();
  expect(screen.getByText("→ 17 after")).toBeInTheDocument();
  expect(fetchTransferStock).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: "source", toWarehouseId: "destination", productIds: ["p"] }));
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
  vi.mocked(fetchTransferStock).mockRejectedValue(new Error("Select an active, usable source warehouse."));
  render(<NewTransferPage />);
  await screen.findAllByRole("option", { name: "Finished Goods" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "source" } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Select an active, usable source warehouse.");
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
});

it("opens from a finished batch with the output store, product and quantity already filled in", async () => {
  serveStock(() => [{ ...soap, quantity: 40, reserved: 0, available: 40 }, bread]);
  window.history.replaceState(null, "", "/warehouse/transfers/new?from=source&line=p%3A24&ref=WO-0007");
  render(<NewTransferPage />);
  expect(await screen.findByRole("spinbutton", { name: "Quantity for Soap SKU-072" })).toHaveValue(24);
  expect(fetchTransferStock).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: "source", productIds: ["p"] }));
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

