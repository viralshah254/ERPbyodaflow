import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import NewTransferPage from "./new/page";
import { createTransfer, fetchTransferStock } from "@/lib/api/warehouse-transfers";
import { useOrgContextStore } from "@/stores/orgContextStore";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/layout/page-header", () => ({ PageHeader: ({ actions }: { actions: React.ReactNode }) => <header>{actions}</header> }));
vi.mock("@/components/layout/page-shell", () => ({ LIST_PAGE_SHELL_CLASS: "", LIST_PAGE_BODY_CLASS: "", LIST_TABLE_SURFACE_CLASS: "", PageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/components/copilot/ExplainThis", () => ({ ExplainThis: () => null }));
vi.mock("@/lib/rbac/use-write-guard", () => ({ useCanWriteInventory: () => true }));
const profile = vi.hoisted(() => ({ fixedOrderSheet: false }));
vi.mock("@/lib/fmcg/operating-profile", () => ({ useOperatingProfile: () => profile }));
vi.mock("@/lib/api/warehouse-transfers", () => ({ createTransfer: vi.fn().mockResolvedValue({ id: "draft-1" }), fetchTransferStock: vi.fn() }));
vi.mock("@/lib/api/lookups", () => ({ fetchWarehouseOptions: vi.fn().mockResolvedValue([{ id: "source", label: "Finished Goods" }, { id: "destination", label: "Dispatch" }, { id: "mar", label: "MAR - MARULA STORE", transferTargetIssue: { label: "Purpose not set", reason: "MAR - MARULA STORE has no purpose set, so the ERP will not put stock into it.", fix: "Set its purpose, for example Dispatch for a route store", href: "/master/warehouses?edit=mar" } }, { id: "choco", label: "CHOCO", transferSourceBlock: "Purpose not set", transferSourceIssue: { label: "Purpose not set", reason: "CHOCO has no purpose set, so the ERP cannot tell if its stock may be sent out.", fix: "Set its purpose to Storage, Receiving or Dispatch", href: "/master/warehouses?edit=choco" } }]) }));
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
  profile.fixedOrderSheet = false;
  useOrgContextStore.setState({ templateId: null });
});

type StockRow = Awaited<ReturnType<typeof fetchTransferStock>>["items"][number];

/** Serves stock the way the API does: searched, limited to asked-for products, and paged. */
function serveStock(rows: (toWarehouseId?: string) => StockRow[], catalog: StockRow[] = []) {
  vi.mocked(fetchTransferStock).mockImplementation(async (query) => {
    let items = rows(query.toWarehouseId);
    if (query.productIds) items = items.filter((row) => query.productIds!.includes(row.productId));
    if (query.productIds && query.includeEmpty) {
      items = [...items, ...catalog.filter((row) => query.productIds!.includes(row.productId) && !items.some((item) => item.productId === row.productId))
        .map((row) => ({ ...row, quantity: 0, reserved: 0, available: 0 }))];
    }
    if (query.itemRole) items = items.filter((row) => (row as StockRow & { itemRole?: string }).itemRole === query.itemRole);
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
  await screen.findByRole("option", { name: "CHOCO · Purpose not set" });
  fireEvent.change(screen.getByLabelText("From warehouse"), { target: { value: "choco" } });
  expect(fetchTransferStock).not.toHaveBeenCalledWith(expect.objectContaining({ warehouseId: "choco" }));
  const notice = screen.getByRole("alert", { name: "Store cannot send stock" });
  expect(notice).toHaveTextContent("CHOCO has no purpose set");
  const fix = screen.getByRole("link", { name: /Set its purpose to Storage, Receiving or Dispatch/ });
  expect(fix).toHaveAttribute("href", "/master/warehouses?edit=choco");
  expect(fix).toHaveAttribute("target", "_blank");
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


it("lists finished goods by default, filters by material type and search, and keeps a loading note's quantities first", async () => {
  profile.fixedOrderSheet = true;
  const cake = { productId: "cake", sku: "25", name: "Half decorated cake", uom: "EA", quantity: 30, reserved: 0, available: 30, itemRole: "FINISHED" };
  const bites = { productId: "bites", sku: "29", name: "Super bites mandazi", uom: "EA", quantity: 50, reserved: 0, available: 50, itemRole: "FINISHED" };
  const flour = { productId: "flour", sku: "RM-1", name: "Flour", uom: "KG", quantity: 90, reserved: 0, available: 90, itemRole: "RAW" };
  serveStock(() => [bites, cake, flour]);
  window.history.replaceState(null, "", "/warehouse/transfers/new?from=source&to=destination&line=cake%3A7&ref=Loader+note+LDN-0007&return=load");
  render(<NewTransferPage />);
  expect(await screen.findByRole("spinbutton", { name: "Quantity for Half decorated cake 25" })).toHaveValue(7);
  expect(screen.getByRole("spinbutton", { name: "Quantity for Super bites mandazi 29" })).toHaveValue(null);
  expect(screen.queryByRole("spinbutton", { name: /Quantity for Flour/ })).toBeNull();
  expect(screen.queryByRole("button", { name: "Browse" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  const quantities = screen.getAllByRole("spinbutton", { name: /Quantity for/ });
  expect(quantities.map((input) => input.getAttribute("aria-label"))).toEqual(["Quantity for Half decorated cake 25", "Quantity for Super bites mandazi 29"]);
  expect(fetchTransferStock).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: "source", itemRole: "FINISHED", limit: 100 }));

  fireEvent.change(screen.getByRole("searchbox", { name: "Filter finished goods" }), { target: { value: "mandazi" } });
  expect(screen.queryByRole("spinbutton", { name: "Quantity for Half decorated cake 25" })).toBeNull();
  fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity for Super bites mandazi 29" }), { target: { value: "5" } });
  fireEvent.change(screen.getByRole("searchbox", { name: "Filter finished goods" }), { target: { value: "" } });

  expect(screen.getByRole("radio", { name: "Finished goods" })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(screen.getByRole("radio", { name: "Raw materials" }));
  expect(await screen.findByRole("spinbutton", { name: "Quantity for Flour RM-1" })).toHaveValue(null);
  expect(fetchTransferStock).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: "source", itemRole: "RAW" }));
  expect(screen.getByRole("spinbutton", { name: "Quantity for Half decorated cake 25" })).toHaveValue(7);
  expect(screen.getByRole("spinbutton", { name: "Quantity for Super bites mandazi 29" })).toHaveValue(5);
  expect(screen.queryByRole("button", { name: "Browse" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "All stock" }));
  await waitFor(() => expect(fetchTransferStock).toHaveBeenLastCalledWith(expect.not.objectContaining({ itemRole: expect.anything() })));
  expect(await screen.findByRole("spinbutton", { name: "Quantity for Flour RM-1" })).toBeInTheDocument();

  vi.mocked(createTransfer).mockResolvedValueOnce({ id: "t-2", number: "TRF-0010", status: "RECEIVED" });
  fireEvent.click(screen.getByRole("button", { name: "Transfer now" }));
  await waitFor(() => expect(createTransfer).toHaveBeenLastCalledWith(expect.objectContaining({
    reference: "Loader note LDN-0007",
    lines: [
      { productId: "cake", sku: "25", productName: "Half decorated cake", quantity: 7, unit: "EA" },
      { productId: "bites", sku: "29", productName: "Super bites mandazi", quantity: 5, unit: "EA" },
    ],
  })));
  expect(await screen.findByRole("button", { name: "Back to route pick lists" })).toBeInTheDocument();
});

it("lists what the loading note needs first, outlined in red when the store cannot cover it, and moves what it has", async () => {
  profile.fixedOrderSheet = true;
  const cake = { productId: "cake", sku: "25", name: "Half decorated cake", uom: "EA", quantity: 12, reserved: 0, available: 12, itemRole: "FINISHED" };
  const bun = { productId: "bun", sku: "31", name: "Sweet bun", uom: "EA", quantity: 0, reserved: 0, available: 0, itemRole: "FINISHED" };
  const bites = { productId: "bites", sku: "29", name: "Super bites mandazi", uom: "EA", quantity: 50, reserved: 0, available: 50, itemRole: "FINISHED" };
  serveStock(() => [bites, cake], [bun]);
  window.history.replaceState(null, "", "/warehouse/transfers/new?from=source&to=destination&line=cake%3A20&line=bun%3A6&ref=Loader+note+LDN-0008&return=load&back=%2Fwarehouse%2Froute-pick-lists%2Fn8");
  render(<NewTransferPage />);

  const cakeQty = await screen.findByRole("spinbutton", { name: "Quantity for Half decorated cake 25" });
  await waitFor(() => expect(cakeQty).toHaveValue(12));
  const bunQty = screen.getByRole("spinbutton", { name: "Quantity for Sweet bun 31" });
  expect(bunQty).toHaveValue(null);
  expect(bunQty).toBeDisabled();
  expect(screen.getAllByRole("spinbutton", { name: /Quantity for/ }).map((input) => input.getAttribute("aria-label")))
    .toEqual(["Quantity for Half decorated cake 25", "Quantity for Sweet bun 31", "Quantity for Super bites mandazi 29"]);
  expect(fetchTransferStock).toHaveBeenCalledWith(expect.objectContaining({ productIds: ["bun"], includeEmpty: true }));

  expect(screen.getByRole("alert", { name: "Needed stock missing" })).toHaveTextContent("Finished Goods cannot cover 2 of the 2 needed products");
  expect(document.querySelectorAll("tr[data-short]")).toHaveLength(2);
  expect(screen.getByText("None at Finished Goods")).toBeInTheDocument();
  expect(screen.getByText("8 EA short here")).toBeInTheDocument();
  const make = screen.getByRole("link", { name: /Make 6 in production/ });
  expect(make).toHaveAttribute("target", "_blank");
  expect(make.getAttribute("href")).toBe("/manufacturing/work-orders?make=bun&qty=6&sku=31");
  expect(screen.getByRole("link", { name: /Production plan/ })).toHaveAttribute("target", "_blank");

  vi.mocked(createTransfer).mockResolvedValueOnce({ id: "t-3", number: "TRF-0011", status: "RECEIVED" });
  fireEvent.click(screen.getByRole("button", { name: "Transfer now" }));
  await waitFor(() => expect(createTransfer).toHaveBeenLastCalledWith(expect.objectContaining({
    reference: "Loader note LDN-0008",
    lines: [{ productId: "cake", sku: "25", productName: "Half decorated cake", quantity: 12, unit: "EA" }],
  })));
  expect(await screen.findByRole("link", { name: /View TRF-0011/ })).toHaveAttribute("target", "_blank");
  fireEvent.click(screen.getByRole("button", { name: "Back to the loading note" }));
  expect(router.push).toHaveBeenCalledWith("/warehouse/route-pick-lists/n8");
  fireEvent.click(screen.getByRole("button", { name: "Transfer the other 2 from another store" }));
  expect(await screen.findByLabelText("From warehouse")).toHaveValue("");
  expect(screen.getByLabelText("Reference (optional)")).toHaveValue("Loader note LDN-0008");
});

it("lists Joy finished goods from item code 1 upward", async () => {
  profile.fixedOrderSheet = true;
  useOrgContextStore.setState({ templateId: "fmcg-bakery" });
  const ten = { productId: "ten", sku: "10", code: "10", name: "Code ten", uom: "EA", quantity: 1, reserved: 0, available: 1, itemRole: "FINISHED" as const };
  const two = { productId: "two", sku: "2", code: "2", name: "Code two", uom: "EA", quantity: 1, reserved: 0, available: 1, itemRole: "FINISHED" as const };
  const one = { productId: "one", sku: "1", code: "1", name: "Code one", uom: "EA", quantity: 1, reserved: 0, available: 1, itemRole: "FINISHED" as const };
  serveStock(() => [ten, two, one]);
  window.history.replaceState(null, "", "/warehouse/transfers/new?from=source");
  render(<NewTransferPage />);
  await screen.findByRole("spinbutton", { name: "Quantity for Code one 1" });
  expect(screen.getAllByRole("spinbutton", { name: /Quantity for/ }).map((input) => input.getAttribute("aria-label")))
    .toEqual(["Quantity for Code one 1", "Quantity for Code two 2", "Quantity for Code ten 10"]);
});

it("explains a receiving store with no purpose and holds the transfer until it is set", async () => {
  serveStock(() => [{ ...soap, quantity: 40, reserved: 0, available: 40 }]);
  window.history.replaceState(null, "", "/warehouse/transfers/new?from=source&to=mar&line=p%3A5");
  render(<NewTransferPage />);
  const notice = await screen.findByRole("alert", { name: "Store cannot receive stock" });
  expect(notice).toHaveTextContent("MAR - MARULA STORE has no purpose set");
  const fix = screen.getByRole("link", { name: /Set its purpose, for example Dispatch/ });
  expect(fix).toHaveAttribute("href", "/master/warehouses?edit=mar");
  expect(fix).toHaveAttribute("target", "_blank");
  expect(await screen.findByRole("spinbutton", { name: "Quantity for Soap SKU-072" })).toHaveValue(5);
  expect(screen.getByRole("button", { name: "Transfer now" })).toBeDisabled();
  expect(screen.getByText("Set up MAR first. See the note under Send stock to.")).toBeInTheDocument();
});
