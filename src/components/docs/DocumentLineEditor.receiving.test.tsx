import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DocumentLineEditor, type DocumentLine } from "./DocumentLineEditor";
import { fetchProductsPageApi } from "@/lib/api/products";
import { setProductsCache } from "@/lib/data/products.repo";

vi.mock("@/lib/api/products", () => ({
  fetchProductsPageApi: vi.fn(),
  fetchProductApi: vi.fn().mockResolvedValue(null),
  fetchProductsApi: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/api/client", () => ({ isApiConfigured: () => true }));
vi.mock("@/lib/api/pricing", () => ({ fetchPriceListsForUi: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/api/product-master", () => ({
  fetchProductVariantsApi: vi.fn().mockResolvedValue([]),
  fetchDocumentProductDataApi: vi.fn().mockResolvedValue({}),
}));

const TOTAL = 23;
const row = (n: number) => ({ id: `rm-${n}`, code: `RM${n}`, sku: `RM${n}`, name: `Material ${n}`, unit: "KG", itemRole: n % 2 ? "RAW" : "PACKAGING", productType: "RAW" });

function Harness({ initial = [] as DocumentLine[] }) {
  const [lines, setLines] = React.useState<DocumentLine[]>(initial);
  return (
    <>
      <DocumentLineEditor
        pagedReceiving
        useCostPricing
        mode="purchasing"
        fmcgOrg
        plantCatalogue
        productFilter="purchasable"
        currency="KES"
        lines={lines}
        onLinesChange={setLines}
      />
      <output data-testid="received">{lines.filter((l) => l.qty > 0).map((l) => `${l.name}=${l.qty}`).join(",")}</output>
    </>
  );
}

beforeEach(() => {
  setProductsCache([]);
  vi.mocked(fetchProductsPageApi).mockReset().mockImplementation(async (opts) => {
    const limit = opts?.limit ?? 10;
    const offset = Number(opts?.cursor ?? 0);
    const search = opts?.search?.toLowerCase();
    const all = Array.from({ length: TOTAL }, (_, i) => row(i + 1)).filter((r) => !search || r.name.toLowerCase().includes(search));
    return { items: all.slice(offset, offset + limit), limit, offset, hasMore: offset + limit < all.length, nextCursor: null, total: all.length } as never;
  });
});

it("lists raw materials and packaging by numbered page and keeps quantities across pages", async () => {
  render(<Harness />);
  const first = await screen.findByLabelText("Quantity for Material 1");
  expect(first).toHaveValue("");
  expect(fetchProductsPageApi).toHaveBeenCalledWith(
    expect.objectContaining({ itemRoles: ["RAW", "PACKAGING"], status: "ACTIVE", limit: 10, cursor: "0", includeTotal: true }),
  );
  expect(screen.getByText("1–10 of 23")).toBeInTheDocument();
  expect(screen.queryByLabelText("Quantity for Material 11")).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Search products to add" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Browse" })).not.toBeInTheDocument();

  fireEvent.change(first, { target: { value: "4" } });
  fireEvent.blur(first);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(await screen.findByLabelText("Quantity for Material 11")).toHaveValue("");
  expect(screen.getByText("11–20 of 23")).toBeInTheDocument();
  expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({ cursor: "10" }));

  fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
  expect(await screen.findByLabelText("Quantity for Material 23")).toBeInTheDocument();
  expect(screen.getByText("21–23 of 23")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Page 1" }));
  expect(await screen.findByLabelText("Quantity for Material 1")).toHaveValue("4");
  expect(screen.getByTestId("received")).toHaveTextContent("Material 1=4");
});

it("searches the server and shows only the received lines on request", async () => {
  render(<Harness />);
  const first = await screen.findByLabelText("Quantity for Material 1");
  fireEvent.change(first, { target: { value: "2" } });
  fireEvent.blur(first);

  fireEvent.change(screen.getByRole("searchbox", { name: "Search raw materials and packaging" }), { target: { value: "Material 2" } });
  await waitFor(() => expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({ search: "Material 2" })));
  expect(await screen.findByLabelText("Quantity for Material 20")).toBeInTheDocument();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search raw materials and packaging" }), { target: { value: "" } });
  fireEvent.click(await screen.findByRole("button", { name: "On this receipt (1)" }));
  expect(await screen.findByLabelText("Quantity for Material 1")).toHaveValue("2");
  expect(screen.queryByLabelText("Quantity for Material 2")).not.toBeInTheDocument();
});

it("changes how many rows a page holds", async () => {
  render(<Harness />);
  await screen.findByLabelText("Quantity for Material 1");
  fireEvent.click(screen.getByRole("combobox", { name: "Rows per page" }));
  fireEvent.click(await screen.findByRole("option", { name: "25" }));
  await waitFor(() => expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, cursor: "0" })));
  expect(await screen.findByLabelText("Quantity for Material 23")).toBeInTheDocument();
  expect(screen.getByText("1–23 of 23")).toBeInTheDocument();
});
