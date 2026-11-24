import React from "react";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DocumentLineEditor, type DocumentLine } from "./DocumentLineEditor";
import { fetchProductsPageApi, fetchProductApi } from "@/lib/api/products";
import { fetchDocumentProductDataApi, fetchProductVariantsApi } from "@/lib/api/product-master";
import { setProductsCache } from "@/lib/data/products.repo";
vi.mock("@/lib/api/products", () => ({ fetchProductsPageApi: vi.fn(), fetchProductApi: vi.fn().mockResolvedValue(null), fetchProductsApi: vi.fn().mockResolvedValue([]) }));
const api = vi.hoisted(() => ({ configured: false }));
vi.mock("@/lib/api/client", () => ({ isApiConfigured: () => api.configured }));
vi.mock("@/lib/api/pricing", () => ({ fetchPriceListsForUi: vi.fn().mockResolvedValue([{ id: "standard", name: "Standard price" }]) }));
vi.mock("@/lib/api/product-master", () => ({ fetchProductVariantsApi: vi.fn().mockResolvedValue([]), fetchDocumentProductDataApi: vi.fn() }));
const products = [
  { id: "queen", code: "1", sku: "1", name: "Queen cakes", unit: "PCS", itemRole: "FINISHED", productType: "FINISHED" },
  { id: "cake", code: "FG-CAKE", sku: "FG-CAKE", barcode: "6164000350467", name: "Celebration cake", unit: "PCS", itemRole: "FINISHED", productType: "BOTH" },
];
function Harness({ initial = [], queenPrice = 43.1, inclusive = true, revision = 0, discount = 0, editorKey = 0, packSizeFromName = false, fixedItemCodes }: { initial?: DocumentLine[]; queenPrice?: number; inclusive?: boolean; revision?: number; discount?: number; editorKey?: number; packSizeFromName?: boolean; fixedItemCodes?: { from: number; to: number } }) {
  const [lines, setLines] = React.useState<DocumentLine[]>(initial);
  const [data, setData] = React.useState<Awaited<ReturnType<typeof fetchDocumentProductDataApi>>>({});
  return <DocumentLineEditor fixedItemCodes={fixedItemCodes} onDocumentProductData={setData} packagingByProductId={Object.fromEntries(Object.entries(data).map(([id, row]) => [id, row.packaging]))} pricingByProductId={Object.fromEntries(Object.entries(data).map(([id, row]) => [id, row.pricing]))} key={editorKey} sheetFinishedGoods packSizeFromName={packSizeFromName} fmcgOrg plantCatalogue productFilter="sellable" currency="KES" priceListId={revision ? "customer-b" : "standard"} repriceExistingRevision={revision} lines={lines} onLinesChange={setLines} fmcgCatalogByProductId={{ queen: { productId: "queen", pricePerPiece: queenPrice, discountPercent: discount, ...(packSizeFromName ? { packPrices: [{ uom: "PACK", unitsPer: 1, unitPrice: queenPrice }] } : {}) }, cake: { productId: "cake", pricePerPiece: 100 } }} linesAreTaxInclusive={inclusive} taxCodes={[{ id: "vat", code: "VAT16", name: "VAT", rate: 16 }]} defaultLineTaxCodeId="vat" />;
}
beforeEach(() => { api.configured = false; vi.mocked(fetchProductApi).mockClear(); vi.mocked(fetchProductVariantsApi).mockClear(); vi.mocked(fetchDocumentProductDataApi).mockReset().mockResolvedValue({}); setProductsCache([]); vi.mocked(fetchProductsPageApi).mockReset().mockResolvedValue({ items: products, hasMore: false, nextCursor: null } as never); });

it("moves from product to quantity and back to a fresh product search with Enter", async () => {
  function LineByLineForm() {
    const [lines, setLines] = React.useState<DocumentLine[]>([]);
    return (
      <DocumentLineEditor
        currency="KES"
        fmcgOrg
        lineByLine
        productFilter="sellable"
        lines={lines}
        onLinesChange={setLines}
        catalogPricesByProductId={{ queen: 40, cake: 100 }}
      />
    );
  }
  render(<LineByLineForm />);
  const search = () => screen.getByRole("combobox", { name: "Search products to add" });
  await waitFor(() => expect(search()).toBeEnabled());
  expect(screen.getByRole("button", { name: "Browse" })).toBeInTheDocument();
  fireEvent.change(search(), { target: { value: "Queen" } });
  fireEvent.keyDown(search(), { key: "Enter" });

  const quantity = await screen.findByLabelText("Quantity for Queen cakes");
  await waitFor(() => expect(quantity).toHaveFocus());
  expect(quantity).toHaveValue("");
  fireEvent.keyDown(quantity, { key: "Enter" });
  expect(quantity).toHaveFocus();
  fireEvent.change(quantity, { target: { value: "2.5" } });
  fireEvent.keyDown(quantity, { key: "Enter" });
  expect(search()).toHaveFocus();
  expect(search()).toHaveValue("");

  fireEvent.change(search(), { target: { value: "6164000350467" } });
  fireEvent.click(screen.getByRole("option", { name: /Celebration cake/ }));
  const nextQuantity = await screen.findByLabelText("Quantity for Celebration cake");
  await waitFor(() => expect(nextQuantity).toHaveFocus());
  expect(nextQuantity).toHaveValue("");
  expect(quantity).toHaveValue("2.5");
  expect(within(quantity.closest("tr")!).getByText("KES 100.00")).toBeInTheDocument();
});

it("keeps the catalogue closed until Browse is opened", async () => {
  function LineByLineForm() {
    const [lines, setLines] = React.useState<DocumentLine[]>([]);
    return (
      <DocumentLineEditor
        currency="KES"
        fmcgOrg
        lineByLine
        productFilter="sellable"
        lines={lines}
        onLinesChange={setLines}
      />
    );
  }
  render(<LineByLineForm />);
  const search = screen.getByRole("combobox", { name: "Search products to add" });
  await waitFor(() => expect(search).toBeEnabled());
  fireEvent.focus(search);
  expect(screen.queryByRole("option", { name: /Queen cakes/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Browse" }));
  expect(await screen.findByRole("dialog", { name: "Add products" })).toBeInTheDocument();
});

it("adds the quantity typed beside the product", async () => {
  function LineByLineForm() {
    const [lines, setLines] = React.useState<DocumentLine[]>([]);
    return (
      <DocumentLineEditor
        currency="KES"
        fmcgOrg
        lineByLine
        productFilter="sellable"
        lines={lines}
        onLinesChange={setLines}
        catalogPricesByProductId={{ queen: 40, cake: 100 }}
      />
    );
  }
  render(<LineByLineForm />);
  const search = screen.getByRole("combobox", { name: "Search products to add" });
  await waitFor(() => expect(search).toBeEnabled());
  fireEvent.change(search, { target: { value: "Queen" } });
  fireEvent.change(await screen.findByLabelText("Order quantity for Queen cakes"), { target: { value: "6" } });
  fireEvent.click(screen.getByRole("option", { name: /Queen cakes/ }));
  expect(await screen.findByLabelText("Quantity for Queen cakes")).toHaveValue("6");
  expect(within(screen.getByLabelText("Quantity for Queen cakes").closest("tr")!).getByText("KES 240.00")).toBeInTheDocument();
});

it("adds several ticked products in one step", async () => {
  function LineByLineForm() {
    const [lines, setLines] = React.useState<DocumentLine[]>([]);
    return (
      <DocumentLineEditor
        currency="KES"
        fmcgOrg
        lineByLine
        productFilter="sellable"
        lines={lines}
        onLinesChange={setLines}
        catalogPricesByProductId={{ queen: 40, cake: 100 }}
      />
    );
  }
  render(<LineByLineForm />);
  const search = screen.getByRole("combobox", { name: "Search products to add" });
  await waitFor(() => expect(search).toBeEnabled());
  fireEvent.change(search, { target: { value: "Queen" } });
  fireEvent.click(await screen.findByRole("checkbox", { name: "Select Queen cakes" }));
  fireEvent.change(search, { target: { value: "Celebration" } });
  fireEvent.click(await screen.findByRole("checkbox", { name: "Select Celebration cake" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 2 products" }));
  expect(await screen.findByLabelText("Quantity for Queen cakes")).toBeInTheDocument();
  expect(screen.getByLabelText("Quantity for Celebration cake")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Search products to add" })).toHaveValue("");
});

async function searchBox() {
  const search = await screen.findByRole("combobox", { name: "Search products to add" });
  await waitFor(() => expect(search).toBeEnabled());
  return search;
}

async function addFromSearch(query: string, option: RegExp) {
  fireEvent.change(await searchBox(), { target: { value: query } });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

it("keeps the catalogue off the page until a product is searched or browsed", async () => {
  render(<Harness />);
  expect(await screen.findByRole("button", { name: "Browse" })).toBeEnabled();
  expect(screen.getByRole("img", { name: "No products selected" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Quantity for Queen cakes")).not.toBeInTheDocument();
  await addFromSearch("Queen", /Queen cakes/);
  const input = await screen.findByLabelText("Quantity for Queen cakes");
  expect(input).toHaveValue("1");
  expect(screen.queryByLabelText("Quantity for Celebration cake")).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.blur(input);
  const row = within(input.closest("tr")!);
  expect(row.getByText("KES 86.20")).toBeInTheDocument();
  expect(screen.getByText("Includes KES 11.89 tax")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove Queen cakes" }));
  expect(screen.queryByLabelText("Quantity for Queen cakes")).not.toBeInTheDocument();
});


function finishedRows(from: number, to: number) {
  return Array.from({ length: to - from }, (_, i) => ({ ...products[0], id: `fg-${from + i}`, sku: String(from + i), code: String(from + i), name: `Finished ${from + i}` }));
}

it("browses finished goods in pages and adds the ticked products below the search", async () => {
  api.configured = true;
  vi.mocked(fetchProductsPageApi).mockImplementation(async (opts) => {
    if (String(opts?.cursor ?? "0") !== "0") {
      return { items: finishedRows(10, 12), hasMore: false, nextCursor: null } as never;
    }
    return { items: finishedRows(0, 10), hasMore: true, nextCursor: "10" } as never;
  });
  render(<Harness />);
  fireEvent.click(await screen.findByRole("button", { name: "Browse" }));
  expect(await screen.findByRole("heading", { name: "Add products" })).toBeInTheDocument();
  expect(await screen.findByText("Finished 0")).toBeInTheDocument();
  expect(screen.queryByText("Finished 10")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(await screen.findByText("Finished 11")).toBeInTheDocument();
  expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({ cursor: "10", limit: 100, sellable: true }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Finished 0" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Select Finished 11" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 2 lines" }));
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(await screen.findByLabelText("Quantity for Finished 0")).toBeInTheDocument();
  expect(screen.getByLabelText("Quantity for Finished 11")).toBeInTheDocument();
  expect(screen.queryByLabelText("Quantity for Finished 1")).not.toBeInTheDocument();
});

it("lists every product in the fixed item-code range with no search, browse or remove", async () => {
  api.configured = true;
  vi.mocked(fetchProductsPageApi).mockImplementation(async (opts) => {
    if (String(opts?.cursor ?? "0") !== "0") return { items: finishedRows(100, 102), hasMore: false, nextCursor: null } as never;
    return { items: finishedRows(1, 100), hasMore: true, nextCursor: "100" } as never;
  });
  render(<Harness fixedItemCodes={{ from: 1, to: 101 }} />);
  expect(await screen.findByLabelText("Quantity for Finished 1")).toHaveValue("0");
  expect(screen.getByLabelText("Quantity for Finished 101")).toHaveValue("0");
  expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({ itemCodes: { from: 1, to: 101 }, limit: 100, cursor: "100" }));
  expect(screen.queryByRole("combobox", { name: "Search products to add" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Browse" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remove Finished 1" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Quantity for Finished 1"), { target: { value: "3" } });
  fireEvent.blur(screen.getByLabelText("Quantity for Finished 1"));
  expect(screen.getByLabelText("Quantity for Finished 1")).toHaveValue("3");
});

it("finds a finished good that is not on the first page by asking the server", async () => {
  api.configured = true;
  vi.mocked(fetchProductsPageApi).mockImplementation(async (opts) => {
    if (opts?.search) return { items: finishedRows(40, 41), hasMore: false, nextCursor: null } as never;
    return { items: finishedRows(0, 10), hasMore: true, nextCursor: "10" } as never;
  });
  render(<Harness />);
  await searchBox();
  fireEvent.change(screen.getByRole("combobox", { name: "Search products to add" }), { target: { value: "Finished 40" } });
  fireEvent.click(await screen.findByRole("option", { name: /Finished 40/ }));
  expect(await screen.findByLabelText("Quantity for Finished 40")).toHaveValue("1");
  expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({ search: "Finished 40" }));
});

it("uses PCS for a single cake and PACK for a Joy retail multipack without multiplying its price", async () => {
  api.configured = true;
  const rows = [
    { ...products[0], name: "Queen cakes 8PCS (250 GMS)", unit: "EA", size: "8pcs" },
    { ...products[1], name: "Celebration cake (500 GMS)", unit: "EA", size: "500 g" },
  ];
  vi.mocked(fetchProductsPageApi).mockResolvedValue({ items: rows, hasMore: false, nextCursor: null } as never);
  vi.mocked(fetchDocumentProductDataApi).mockResolvedValue({
    queen: { packaging: [{ uom: "PK", baseUom: "EA", unitsPer: 8 }], pricing: [] },
    cake: { packaging: [], pricing: [] },
  });
  render(<Harness packSizeFromName />);
  await addFromSearch("Queen", /Queen cakes 8PCS/);
  await addFromSearch("Celebration", /Celebration cake/);
  const input = await screen.findByLabelText("Quantity for Queen cakes 8PCS (250 GMS)");
  const pack = within(input.closest("tr")!);
  const piece = within(screen.getByLabelText("Quantity for Celebration cake (500 GMS)").closest("tr")!);
  expect(pack.getByRole("combobox")).toHaveTextContent("PACK");
  expect(piece.getByRole("combobox")).toHaveTextContent("PCS");
  fireEvent.change(screen.getByLabelText("Quantity for Celebration cake (500 GMS)"), { target: { value: "0" } });
  fireEvent.blur(screen.getByLabelText("Quantity for Celebration cake (500 GMS)"));
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.blur(input);
  expect(pack.getByText("KES 86.20")).toBeInTheDocument();
  expect(screen.getByText("Includes KES 11.89 tax")).toBeInTheDocument();
});

it("limits Joy search and browse to finished goods even if sellable raw or semi-finished items are returned", async () => {
  api.configured = true;
  const raw = { id: "raw", code: "RM152", name: "Black forest base", itemRole: "RAW", productType: "BOTH" };
  const semi = { id: "semi", code: "RM151", name: "Chocolate cake base", itemRole: "SEMI", productType: "FINISHED" };
  vi.mocked(fetchProductsPageApi).mockResolvedValue({ items: [...products, raw, semi], hasMore: false, nextCursor: null } as never);
  render(<Harness packSizeFromName />);
  const search = await searchBox();
  fireEvent.change(search, { target: { value: "RM152" } });
  await waitFor(() => expect(screen.getByRole("listbox", { name: "Matching products" })).toBeInTheDocument());
  expect(screen.queryByRole("option", { name: /Black forest base/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Browse" }));
  const dialog = await screen.findByRole("dialog", { name: "Add products" });
  expect(within(dialog).getByText("Queen cakes")).toBeInTheDocument();
  expect(within(dialog).getByText("Celebration cake")).toBeInTheDocument();
  expect(within(dialog).queryByText("Black forest base")).not.toBeInTheDocument();
  expect(within(dialog).queryByText("Chocolate cake base")).not.toBeInTheDocument();
  expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({ itemRole: "FINISHED", sellable: true }));
});

it("keeps failed metadata loading recoverable instead of listing unfinished prices", async () => {
  api.configured = true;
  vi.mocked(fetchDocumentProductDataApi).mockRejectedValueOnce(new Error("Offline"));
  render(<Harness />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
  expect(screen.queryByLabelText("Quantity for Queen cakes")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry catalogue" }));
  await searchBox();
  expect(vi.mocked(fetchDocumentProductDataApi).mock.calls.length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByLabelText("Quantity for Queen cakes")).not.toBeInTheDocument();
});

it("keeps new lines in the SKU unit even when a default pack is known", async () => {
  api.configured = true;
  vi.mocked(fetchDocumentProductDataApi).mockResolvedValue({ queen: { packaging: [{ uom: "CTN", baseUom: "PCS", unitsPer: 24, isDefaultSalesUom: true }], pricing: [] }, cake: { packaging: [], pricing: [] } });
  render(<Harness queenPrice={50} />);
  await addFromSearch("Queen", /Queen cakes/);
  const input = await screen.findByLabelText("Quantity for Queen cakes");
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.blur(input);
  const row = within(screen.getByText("Queen cakes").closest("tr")!);
  await waitFor(() => expect(row.getByText("KES 100.00")).toBeInTheDocument());
  expect(row.getByText("KES 50.00")).toBeInTheDocument();
  expect(screen.getByText("Includes KES 13.79 tax")).toBeInTheDocument();
  expect(fetchDocumentProductDataApi).toHaveBeenCalled();
});

it("preserves an existing carton unit and uses batched conversions for quantity and VAT", async () => {
  api.configured = true;
  vi.mocked(fetchDocumentProductDataApi).mockResolvedValue({ queen: { packaging: [{ uom: "CTN", baseUom: "PCS", unitsPer: 24, isDefaultSalesUom: true }], pricing: [] }, cake: { packaging: [], pricing: [] } });
  render(<Harness queenPrice={50} initial={[{ id: "carton", productId: "queen", sku: "1", name: "Queen cakes", uom: "CTN", qty: 1, baseQty: 24, price: 1200, priceReason: "Existing", amount: 1200, taxCodeId: "vat" }]} />);
  const input = await screen.findByLabelText("Quantity for Queen cakes");
  expect(screen.queryByLabelText("Quantity for Celebration cake")).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.blur(input);
  const row = within(screen.getByText("Queen cakes").closest("tr")!);
  expect(row.getByText("KES 2,400.00")).toBeInTheDocument();
  expect(row.getByText("KES 1,200.00")).toBeInTheDocument();
  expect(screen.getByText("Includes KES 331.03 tax")).toBeInTheDocument();
});

it("keeps an edited line and does not fill the rest of the catalogue", async () => {
  render(<Harness initial={[{ id: "existing", productId: "queen", sku: "1", name: "Queen cakes", uom: "PCS", qty: 5, baseQty: 5, price: 43.1, priceReason: "Price list", amount: 215.5 }]} />);
  expect(await screen.findByLabelText("Quantity for Queen cakes")).toHaveValue("5");
  expect(screen.queryByLabelText("Quantity for Celebration cake")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Browse" })).toBeInTheDocument();
});

it("shows a recoverable catalogue error and still adds from search after retry", async () => {
  vi.mocked(fetchProductsPageApi).mockRejectedValueOnce(new Error("Unavailable"));
  render(<Harness />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
  fireEvent.click(screen.getByRole("button", { name: "Retry catalogue" }));
  await addFromSearch("Queen", /Queen cakes/);
  expect(await screen.findByLabelText("Quantity for Queen cakes")).toHaveValue("1");
});

it("edits existing quantities, intentionally reprices for a different customer, and recomputes VAT basis", async () => {
  const initial: DocumentLine[] = [{ id: "stored-line", sourceLineId: "stored-line", productId: "queen", sku: "1", name: "Queen cakes", uom: "PCS", qty: 5, baseQty: 5, price: 40, priceReason: "Existing", amount: 200, taxCodeId: "vat" }];
  const view = render(<Harness initial={initial} />);
  const row = () => within(screen.getByText("Queen cakes").closest("tr")!);
  expect(await screen.findByLabelText("Quantity for Queen cakes")).toHaveValue("5");
  expect(row().getByText("KES 40.00")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Quantity for Queen cakes"), { target: { value: "2" } });
  fireEvent.blur(screen.getByLabelText("Quantity for Queen cakes"));
  expect(row().getByText("KES 80.00")).toBeInTheDocument();
  view.rerender(<Harness initial={initial} queenPrice={50} revision={1} />);
  await waitFor(() => expect(row().getByText("KES 100.00")).toBeInTheDocument());
  expect(row().getByText("KES 50.00")).toBeInTheDocument();
  expect(screen.getByText("Includes KES 13.79 tax")).toBeInTheDocument();
  expect(screen.getByLabelText("Quantity for Queen cakes")).toHaveAttribute("data-line-id", "stored-line");
  view.rerender(<Harness initial={initial} queenPrice={50} revision={1} inclusive={false} />);
  await waitFor(() => expect(row().getByText("KES 116.00")).toBeInTheDocument());
  expect(screen.getByText("KES 16.00")).toBeInTheDocument();
  expect(screen.queryByLabelText("Quantity for Celebration cake")).not.toBeInTheDocument();
});

it("uses the newly selected customer's discount rather than the old document's discount", async () => {
  const initial: DocumentLine[] = [{ id: "old", productId: "queen", sku: "1", name: "Queen cakes", uom: "PCS", qty: 2, baseQty: 2, price: 40, priceReason: "Existing (20% discount)", discount: 20, amount: 80 }];
  const view = render(<Harness initial={initial} />);
  expect(await screen.findByLabelText("Quantity for Queen cakes")).toHaveValue("2");
  view.rerender(<Harness initial={initial} queenPrice={100} discount={10} revision={1} />);
  const row = () => within(screen.getByText("Queen cakes").closest("tr")!);
  await waitFor(() => expect(row().getByText("KES 90.00")).toBeInTheDocument());
  expect(row().getByText("KES 180.00")).toBeInTheDocument();
});

it("reprices a selected line and retains a later manual discount when returning to Lines", async () => {
  const view = render(<Harness queenPrice={100} discount={20} />);
  await addFromSearch("Queen", /Queen cakes/);
  const row = () => within(screen.getByText("Queen cakes").closest("tr")!);
  await waitFor(() => expect(row().getAllByText("KES 80.00").length).toBeGreaterThan(0));
  view.rerender(<Harness queenPrice={100} discount={10} revision={1} />);
  await waitFor(() => expect(row().getAllByText("KES 90.00").length).toBeGreaterThan(0));
  fireEvent.change(screen.getByLabelText("Quantity for Queen cakes"), { target: { value: "2" } });
  fireEvent.blur(screen.getByLabelText("Quantity for Queen cakes"));
  expect(row().getByText("KES 180.00")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show details for Queen cakes" }));
  fireEvent.change(screen.getByLabelText("Discount %"), { target: { value: "5" } });
  fireEvent.blur(screen.getByLabelText("Discount %"));
  expect(row().getByText("KES 190.00")).toBeInTheDocument();
  view.rerender(<Harness queenPrice={100} discount={10} revision={1} editorKey={1} />);
  await waitFor(() => expect(row().getByText("KES 190.00")).toBeInTheDocument());
});

