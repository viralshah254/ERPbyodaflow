import React from "react";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DocumentLineEditor, type DocumentLine } from "./DocumentLineEditor";
import { fetchProductsPageApi } from "@/lib/api/products";
import { setProductsCache } from "@/lib/data/products.repo";
vi.mock("@/lib/api/products", () => ({ fetchProductsPageApi: vi.fn(), fetchProductApi: vi.fn().mockResolvedValue(null), fetchProductsApi: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/api/client", () => ({ isApiConfigured: () => false }));
vi.mock("@/lib/api/pricing", () => ({ fetchPriceListsForUi: vi.fn().mockResolvedValue([{ id: "standard", name: "Standard price" }]) }));
vi.mock("@/lib/api/product-master", () => ({ fetchProductVariantsApi: vi.fn().mockResolvedValue([]) }));
const products = [
  { id: "queen", code: "1", sku: "1", name: "Queen cakes", unit: "PCS", itemRole: "FINISHED", productType: "FINISHED" },
  { id: "cake", code: "FG-CAKE", sku: "FG-CAKE", barcode: "6164000350467", name: "Celebration cake", unit: "PCS", itemRole: "FINISHED", productType: "BOTH" },
];
function Harness({ initial = [], queenPrice = 43.1, inclusive = true, revision = 0, discount = 0, editorKey = 0 }: { initial?: DocumentLine[]; queenPrice?: number; inclusive?: boolean; revision?: number; discount?: number; editorKey?: number }) {
  const [lines, setLines] = React.useState<DocumentLine[]>(initial);
  return <DocumentLineEditor key={editorKey} sheetFinishedGoods fmcgOrg plantCatalogue productFilter="sellable" currency="KES" priceListId={revision ? "customer-b" : "standard"} repriceExistingRevision={revision} lines={lines} onLinesChange={setLines} fmcgCatalogByProductId={{ queen: { productId: "queen", pricePerPiece: queenPrice, discountPercent: discount }, cake: { productId: "cake", pricePerPiece: 100 } }} linesAreTaxInclusive={inclusive} taxCodes={[{ id: "vat", code: "VAT16", name: "VAT", rate: 16 }]} defaultLineTaxCodeId="vat" />;
}
beforeEach(() => { setProductsCache([]); vi.mocked(fetchProductsPageApi).mockReset().mockResolvedValue({ items: products, hasMore: false, nextCursor: null } as never); });
it("shows every finished good inline at zero including alphanumeric codes, without an add popup", async () => {
  render(<Harness />);
  expect(await screen.findByLabelText("Quantity for Queen cakes")).toHaveValue("0");
  expect(screen.getByLabelText("Quantity for Celebration cake")).toHaveValue("0");
  expect(screen.queryByRole("button", { name: "Add products" })).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Quantity for Queen cakes"), { target: { value: "2" } });
  fireEvent.blur(screen.getByLabelText("Quantity for Queen cakes"));
  expect(within(screen.getByText("Queen cakes").closest("tr")!).getByText("KES 86.20")).toBeInTheDocument();
  expect(screen.getAllByText("KES 86.20")).toHaveLength(2);
  expect(screen.getByText("Includes KES 11.89 tax")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Filter finished goods"), { target: { value: "6164000350467" } });
  expect(screen.queryByLabelText("Quantity for Queen cakes")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Quantity for Celebration cake")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Filter finished goods"), { target: { value: "" } });
  expect(screen.getByLabelText("Quantity for Queen cakes")).toHaveValue("2");
  fireEvent.click(screen.getByRole("button", { name: "Clear quantity for Queen cakes" }));
  expect(screen.getByLabelText("Quantity for Queen cakes")).toHaveValue("0");
});
it("preserves prefilled quantities while adding the remaining catalogue rows at zero", async () => {
  render(<Harness initial={[{ id: "existing", productId: "queen", sku: "1", name: "Queen cakes", uom: "PCS", qty: 5, baseQty: 5, price: 43.1, priceReason: "Price list", amount: 215.5 }]} />);
  expect(await screen.findByLabelText("Quantity for Celebration cake")).toHaveValue("0");
  expect(screen.getByLabelText("Quantity for Queen cakes")).toHaveValue("5");
});
it("shows a recoverable catalogue error rather than silently requiring a popup", async () => {
  vi.mocked(fetchProductsPageApi).mockRejectedValueOnce(new Error("Unavailable"));
  render(<Harness />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
  fireEvent.click(screen.getByRole("button", { name: "Retry catalogue" }));
  await waitFor(() => expect(screen.getByLabelText("Quantity for Queen cakes")).toHaveValue("0"));
});

it("edits existing quantities, intentionally reprices for a different customer, and recomputes VAT basis", async () => {
  const initial: DocumentLine[] = [{ id: "stored-line", sourceLineId: "stored-line", productId: "queen", sku: "1", name: "Queen cakes", uom: "PCS", qty: 5, baseQty: 5, price: 40, priceReason: "Existing", amount: 200, taxCodeId: "vat" }];
  const view = render(<Harness initial={initial} />);
  await screen.findByLabelText("Quantity for Celebration cake");
  const row = () => within(screen.getByText("Queen cakes").closest("tr")!);
  expect(screen.getByLabelText("Quantity for Queen cakes")).toHaveValue("5");
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
  expect(screen.getByLabelText("Quantity for Celebration cake")).toHaveValue("0");
});
it("uses the newly selected customer's discount rather than the old document's discount", async () => {
  const initial: DocumentLine[] = [{ id: "old", productId: "queen", sku: "1", name: "Queen cakes", uom: "PCS", qty: 2, baseQty: 2, price: 40, priceReason: "Existing (20% discount)", discount: 20, amount: 80 }];
  const view = render(<Harness initial={initial} />);
  await screen.findByLabelText("Quantity for Celebration cake");
  view.rerender(<Harness initial={initial} queenPrice={100} discount={10} revision={1} />);
  const row = () => within(screen.getByText("Queen cakes").closest("tr")!);
  await waitFor(() => expect(row().getByText("KES 90.00")).toBeInTheDocument());
  expect(row().getByText("KES 180.00")).toBeInTheDocument();
});

it("reprices unused catalogue rows and retains a later manual discount when returning to Lines", async () => {
  const view = render(<Harness queenPrice={100} discount={20} />);
  await screen.findByLabelText("Quantity for Queen cakes");
  const row = () => within(screen.getByText("Queen cakes").closest("tr")!);
  expect(row().getByText("KES 80.00")).toBeInTheDocument();
  view.rerender(<Harness queenPrice={100} discount={10} revision={1} />);
  await waitFor(() => expect(row().getByText("KES 90.00")).toBeInTheDocument());
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
