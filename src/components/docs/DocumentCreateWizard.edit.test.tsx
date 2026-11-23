import { fetchWarehouseOptions } from "@/lib/api/lookups";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DocumentCreateWizard } from "./DocumentCreateWizard";
import { fetchJoyOrderRoute } from "@/lib/api/joy-route-orders";
import { patchDocumentApi, previewDocumentPostingApi } from "@/lib/api/documents";
import { deleteDocumentDraftApi } from "@/lib/api/document-drafts";
import type { DocumentDetailRecord } from "@/lib/types/documents";
const state = vi.hoisted(() => ({ push: vi.fn(), orgId: "org-sfa-6a890b7765042fb41c9d89a6", lineByLine: false, defaults: vi.fn(), taxDefaults: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (selector: any) => selector({ org: { orgId: state.orgId } }) }));
vi.mock("@/stores/orgContextStore", () => ({ useTerminology: () => ({}), useOrgContextStore: (selector: any) => selector({ templateId: "bakex", orgRole: "MANUFACTURER" }) }));
vi.mock("@/lib/org/useFinancialSettings", () => ({ useFinancialSettings: () => ({ settings: { baseCurrency: "KES", enabledCurrencies: ["KES"] } }) }));
vi.mock("@/lib/copilot-feature", () => ({ useCopilotFeatureEnabled: () => false }));
vi.mock("@/lib/api/joy-route-orders", async (original) => ({
  ...await original<typeof import("@/lib/api/joy-route-orders")>(),
  fetchJoyOrderRoute: vi.fn(),
}));
vi.mock("@/components/ui/async-searchable-select", () => ({
  AsyncSearchableSelect: ({ id, value, onValueChange, placeholder, loadOptions, reloadToken, disabled }: {
    id?: string; value?: string; onValueChange: (id: string) => void; placeholder: string; reloadToken?: unknown; disabled?: boolean;
    loadOptions?: (query: string) => Promise<Array<{ id: string; label: string }> | { options: Array<{ id: string; label: string }> }>;
  }) => {
    const [options, setOptions] = React.useState<Array<{ id: string; label: string }>>([]);
    React.useEffect(() => {
      let live = true;
      Promise.resolve().then(() => loadOptions?.("")).then((result) => {
        if (live && result) setOptions(Array.isArray(result) ? result : result.options);
      }).catch(() => {});
      return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadToken]);
    return <select id={id} aria-label={placeholder} disabled={disabled} value={value ?? ""} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">Choose</option><option value="customer">Synthetic QA customer</option>
      {options.filter((option) => option.id !== "customer").map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>;
  },
}));
vi.mock("@/lib/api/sfa-sales-reps", () => ({
  fetchSfaSalesReps: vi.fn().mockResolvedValue({ reps: [{ id: "sfa-ann", name: "Ann Wanjiku", phone: "+254711000001" }], areas: [] }),
  createSfaSalesRep: vi.fn(),
}));
vi.mock("@/lib/api/party-sites", () => ({
  fetchPartySitesApi: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  fetchPartySiteApi: vi.fn(),
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => <select value={value ?? ""} onChange={(event) => onValueChange?.(event.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));
vi.mock("@/lib/api/client", () => ({ isApiConfigured: () => true }));
vi.mock("@/lib/api/documents", () => ({ patchDocumentApi: vi.fn(), createDocumentApi: vi.fn(), previewDocumentPostingApi: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/api/document-drafts", () => ({ deleteDocumentDraftApi: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/api/lookups", () => ({ fetchBranchOptions: vi.fn().mockResolvedValue([]), fetchWarehouseOptions: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/api/pricing", () => ({
  fetchCustomerDefaultPriceLists: vi.fn().mockResolvedValue([{ customerId: "customer", priceListId: "current" }]),
  fetchSupplierDefaultCostLists: vi.fn().mockResolvedValue([]),
  fetchPriceListOptions: vi.fn().mockResolvedValue([{ id: "stored", name: "Agreed tag" }, { id: "current", name: "Current default" }]),
  resolveCustomerPriceListApi: vi.fn().mockResolvedValue({ priceListId: "current", source: "party" }),
  fetchCatalogPricesApi: vi.fn().mockResolvedValue({ items: [{ productId: "queen", price: 43.1 }], priceListName: "Agreed tag" }),
  fetchTaxConfigsApi: vi.fn().mockResolvedValue([{ id: "stored-tax", name: "Stored inclusive VAT", rate: 16, taxCodeId: "vat", pricesAreTaxInclusive: true }, { id: "exclusive-tax", name: "Exclusive VAT", rate: 16, taxCodeId: "vat", pricesAreTaxInclusive: false }]),
  resolveCustomerTaxConfigApi: vi.fn().mockResolvedValue({ taxConfigId: "stored-tax", source: "org", config: { id: "stored-tax", rate: 16, taxCodeId: "vat", pricesAreTaxInclusive: true } }),
  setCustomerDefaultPriceList: state.defaults, setCustomerDefaultTaxConfig: state.taxDefaults,
}));
vi.mock("@/lib/api/payment-terms", () => ({ fetchPaymentTermsApi: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/api/customer-categories", () => ({ fetchCustomerCategoriesApi: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/api/financial-taxes", () => ({ fetchFinancialTaxesApi: vi.fn().mockResolvedValue([{ id: "vat", code: "VAT16", name: "VAT", rate: 16 }]) }));
vi.mock("@/lib/api/uom", () => ({ fetchProductUomsApi: vi.fn().mockResolvedValue([{ code: "PCS" }]) }));
vi.mock("@/lib/api/product-master", () => ({ fetchProductPackagingApi: vi.fn().mockResolvedValue([]), fetchProductPricingApi: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/fmcg/operating-profile", () => ({
  useOperatingProfile: () => ({
    ready: true, routeDispatch: state.orgId !== "org-other", routeCollectionsEnabled: state.orgId !== "org-other",
    fullCatalogueOrderSheet: !state.lineByLine,
    lineItemLayout: state.lineByLine ? "line_by_line" : "catalogue",
    productionRecording: "record_output", packSizeFromName: true, vanSalesBook: true,
  }),
}));
vi.mock("@/lib/data/products.repo", () => ({ hydrateProductsFromApi: vi.fn().mockResolvedValue([]), listProducts: () => [] }));
vi.mock("@/lib/api/parties", () => ({ fetchPartyByIdApi: vi.fn().mockResolvedValue({ id: "customer", name: "Synthetic QA customer" }), fetchPartyCreditSummaryApi: vi.fn().mockResolvedValue(null), toPartyLookupOption: (row: any) => ({ id: row.id, label: row.name }) }));
vi.mock("@/components/customers/CustomerLink", () => ({ CustomerLink: ({ label }: any) => <span>{label}</span> }));
vi.mock("@/components/customers/QuickAddCustomerSheet", () => ({ QuickAddCustomerSheet: () => null }));
vi.mock("@/components/suppliers/QuickAddSupplierSheet", () => ({ QuickAddSupplierSheet: () => null }));
vi.mock("@/components/docs/DocumentLineEditor", async (original) => {
  const actual = await original<typeof import("./DocumentLineEditor")>();
  return { ...actual, DocumentLineEditor: (props: any) => {
    const { onCatalogReadyChange } = props;
    React.useEffect(() => { const timer = setTimeout(() => onCatalogReadyChange?.(true), 0); return () => clearTimeout(timer); }, [onCatalogReadyChange]);
    return <div data-testid="edit-sheet" data-inline={String(props.sheetFinishedGoods)} data-line-by-line={String(props.lineByLine)} data-inclusive={String(props.linesAreTaxInclusive)} data-price-tag={props.priceListId} data-reprice={props.repriceExistingRevision}>
      <button onClick={() => props.onLinesChange((old: any[]) => [...old, { id: "unused", productId: "other", name: "Unused", sku: "2", uom: "PCS", qty: 0, baseQty: 0, price: 50, priceReason: "Price list", amount: 0 }])}>Add zero catalogue row</button>
    </div>;
  } };
});
function doc(type: "sales-order" | "invoice"): DocumentDetailRecord {
  return { attachments: [], comments: [], approvalHistory: [], auditHistory: [], id: "synthetic-doc", type, number: "QA-EDIT", status: "DRAFT", date: "2026-11-09", partyId: "customer", party: "Synthetic QA customer", currency: "KES", total: 86.2, priceListId: "stored", taxConfigId: "stored-tax", linesAreTaxInclusive: true,
    ...(type === "sales-order" ? { warehouseId: "wh-c4-friday" } : {}),
    lines: [{ id: "original-line", productId: "queen", productSku: "1", description: "Queen cakes", qty: 2, unit: "PCS", unitPrice: 43.1, amount: 86.2, tax: 11.89, taxCodeId: "vat" }] };
}
beforeEach(() => { vi.mocked(deleteDocumentDraftApi).mockClear(); vi.mocked(patchDocumentApi).mockReset().mockResolvedValue(doc("invoice")); vi.mocked(previewDocumentPostingApi).mockClear(); state.push.mockClear(); state.defaults.mockClear(); state.taxDefaults.mockClear(); state.orgId = "org-sfa-6a890b7765042fb41c9d89a6"; state.lineByLine = false; });
it.each(["sales-order", "invoice"] as const)("opens existing %s inline without autosaving and saves only positive lines explicitly", async (type) => {
  render(<DocumentCreateWizard type={type} mode="edit" existingDocument={doc(type)} />);
  await waitFor(() => expect(screen.getByRole("tab", { name: /2 Lines/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("tab", { name: /2 Lines/ }));
  const editor = await screen.findByTestId("edit-sheet");
  await waitFor(() => expect(editor).toHaveAttribute("data-price-tag", "stored"));
  expect(editor).toHaveAttribute("data-inline", "true");
  expect(editor).toHaveAttribute("data-inclusive", "true");
  fireEvent.click(screen.getByRole("button", { name: "Add zero catalogue row" }));
  await act(async () => { await new Promise((done) => setTimeout(done, 1750)); });
  expect(patchDocumentApi).not.toHaveBeenCalled();
  expect(state.defaults).not.toHaveBeenCalled();
  expect(state.taxDefaults).not.toHaveBeenCalled();
  const review = screen.getAllByRole("button", { name: "Review & Submit" });
  fireEvent.click(review[review.length - 1]);
  const save = await screen.findByRole("button", { name: "Save changes" });
  fireEvent.click(save);
  await waitFor(() => expect(patchDocumentApi).toHaveBeenCalledTimes(1));
  expect(patchDocumentApi).toHaveBeenCalledWith(type, "synthetic-doc", expect.objectContaining({ priceListId: "stored", taxConfigId: "stored-tax", linesAreTaxInclusive: true, lines: [expect.objectContaining({ productId: "queen", quantity: 2, lineId: "original-line", sourceLineId: "original-line", unitPrice: 43.1 })] }));
});

it.each(["sales-order", "invoice"] as const)("omits incomplete line-by-line rows from %s preview and save", async (type) => {
  state.orgId = "org-other";
  state.lineByLine = true;
  render(<DocumentCreateWizard type={type} mode="edit" existingDocument={doc(type)} />);
  await waitFor(() => expect(screen.getByRole("tab", { name: /2 Lines/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("tab", { name: /2 Lines/ }));
  expect(await screen.findByTestId("edit-sheet")).toHaveAttribute("data-line-by-line", "true");
  fireEvent.click(screen.getByRole("button", { name: "Add zero catalogue row" }));
  const review = screen.getByRole("button", { name: "Review & Submit" });
  await waitFor(() => expect(review).toBeEnabled());
  fireEvent.click(review);

  const payload = expect.objectContaining({
    lines: [expect.objectContaining({ productId: "queen", quantity: 2 })],
  });
  expect(previewDocumentPostingApi).toHaveBeenCalledWith(type, payload);
  fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(state.push).toHaveBeenCalledWith(`/docs/${type}/synthetic-doc`));
  expect(patchDocumentApi).toHaveBeenLastCalledWith(type, "synthetic-doc", payload);
});

it("changes price and VAT tags locally without changing customer defaults or autosaving", async () => {
  render(<DocumentCreateWizard type="invoice" mode="edit" existingDocument={doc("invoice")} />);
  await waitFor(() => expect(screen.getByRole("tab", { name: /2 Lines/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("tab", { name: /2 Lines/ }));
  const editor = await screen.findByTestId("edit-sheet");
  await screen.findByDisplayValue("Agreed tag");
  fireEvent.change(screen.getByDisplayValue("Agreed tag"), { target: { value: "current" } });
  await waitFor(() => expect(editor).toHaveAttribute("data-price-tag", "current"));
  expect(editor).toHaveAttribute("data-reprice", "1");
  fireEvent.change(screen.getByDisplayValue("Stored inclusive VAT"), { target: { value: "exclusive-tax" } });
  await waitFor(() => expect(editor).toHaveAttribute("data-inclusive", "false"));
  await act(async () => { await new Promise((done) => setTimeout(done, 1750)); });
  expect(patchDocumentApi).not.toHaveBeenCalled();
  expect(state.defaults).not.toHaveBeenCalled();
  expect(state.taxDefaults).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "Cancel" }));
  fireEvent.click(await screen.findByRole("button", { name: "Discard" }));
  expect(state.push).toHaveBeenCalledWith("/docs/invoice/synthetic-doc");
  expect(deleteDocumentDraftApi).not.toHaveBeenCalled();
  expect(patchDocumentApi).not.toHaveBeenCalled();
});

it("keeps a Joy sales order on the header until a delivery warehouse is selected", async () => {
  render(<DocumentCreateWizard type="sales-order" mode="edit" existingDocument={{ ...doc("sales-order"), warehouseId: "" }} />);
  await waitFor(() => expect(screen.getByRole("tab", { name: /2 Lines/ })).toBeEnabled());
  expect(screen.getByLabelText("Delivery date")).toBeInTheDocument();
  expect(screen.getByLabelText("Route warehouse")).toBeInTheDocument();
  expect(screen.getByLabelText("Pick from store")).toBeInTheDocument();
  expect(screen.getByLabelText("Sales rep")).toBeInTheDocument();
  expect(screen.getByLabelText("M-Pesa till")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: /2 Lines/ }));
  expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
  expect(screen.queryByTestId("edit-sheet")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review & Submit" }));
  expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
  expect(screen.queryByTestId("edit-sheet")).not.toBeInTheDocument();
});

it("shows the saved pick-from store on a Joy order and saves a change", async () => {
  vi.mocked(fetchWarehouseOptions).mockResolvedValueOnce([
    { id: "legacy", label: "Existing route" },
    { id: "fg", label: "FG - Finished Goods" },
    { id: "cold", label: "Cold store" },
    { id: "dispatch", label: "DISPATCH - Dispatch" },
  ]);
  vi.mocked(fetchJoyOrderRoute).mockResolvedValueOnce({
    routes: [{ id: "legacy", name: "Existing route", collectors: [{ salesRepId: "sfa-ann", salesRep: "Ann Wanjiku", tillNumber: "501001" }] }],
    defaultRouteId: "other-day",
    saved: true,
  });
  render(<DocumentCreateWizard type="sales-order" mode="edit" existingDocument={{
    ...doc("sales-order"),
    warehouseId: "legacy",
    sourceWarehouseId: "fg",
    joyRoute: {
      deliveryDate: "2026-11-16",
      routeName: "Existing route",
      routeWarehouseId: "legacy",
      salesRepId: "sfa-ann",
      salesRep: "Ann Wanjiku",
      tillNumber: "501001",
    },
  }} />);
  expect(await screen.findByLabelText("Delivery date")).toHaveValue("2026-11-16");
  const route = screen.getByLabelText("Route warehouse");
  await waitFor(() => expect(route).toHaveValue("legacy"));
  expect(route).toBeEnabled();
  expect(screen.queryByText("This order keeps its delivery route. You can still change the store it is picked from.")).not.toBeInTheDocument();
  expect(screen.queryByText("The whole order is picked from this store when its route is loaded.")).not.toBeInTheDocument();
  expect(screen.queryByText("From OdaFlow SFA. Optional. You can add or change it later here or on the loader note.")).not.toBeInTheDocument();
  const source = screen.getByLabelText("Pick from store");
  await waitFor(() => expect(source).toHaveValue("fg"));
  expect(screen.getByLabelText("M-Pesa till")).toHaveDisplayValue("501001");
  fireEvent.change(source, { target: { value: "cold" } });
  expect(source).toHaveValue("cold");
  fireEvent.click(screen.getByRole("tab", { name: /2 Lines/ }));
  await screen.findByTestId("edit-sheet");
  const review = screen.getAllByRole("button", { name: "Review & Submit" });
  fireEvent.click(review[review.length - 1]);
  fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(patchDocumentApi).toHaveBeenCalledTimes(1));
  expect(patchDocumentApi).toHaveBeenCalledWith("sales-order", "synthetic-doc", expect.objectContaining({
    warehouseId: "legacy",
    sourceWarehouseId: "cold",
    joyRouteOrder: { deliveryDate: "2026-11-16", salesRepId: "sfa-ann", tillNumber: "501001" },
  }));
});

it("does not ask other organisations for a delivery warehouse on a sales order", async () => {
  state.orgId = "org-other";
  render(<DocumentCreateWizard type="sales-order" mode="edit" existingDocument={{ ...doc("sales-order"), warehouseId: "" }} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeEnabled());
  expect(screen.queryByText(/Route warehouse/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: /2 Lines/ }));
  expect(await screen.findByTestId("edit-sheet")).toBeInTheDocument();
});

it("suggests the delivery-day route on a new Joy order and lets the operator pick an SFA rep and the route's till", async () => {
  const primary = { salesRepId: "primary", salesRep: "Primary rep", tillNumber: "501001" };
  const cover = { salesRepId: "cover", salesRep: "Cover rep", tillNumber: "501002" };
  vi.mocked(fetchJoyOrderRoute).mockImplementation(async (_party, day) => ({
    routes: [
      { id: "mon", name: "Kayole MON", collectors: [primary] },
      { id: "tue", name: "Kayole TUE", collectors: [primary, cover, { ...cover, tillNumber: "501003" }] },
      { id: "other", name: "Cover route", collectors: [cover] },
    ],
    defaultRouteId: day === "2026-11-17" ? "tue" : "mon",
    saved: false,
  }));
  render(<DocumentCreateWizard type="sales-order" />);
  const deliveryDate = await screen.findByLabelText("Delivery date");
  fireEvent.change(deliveryDate, { target: { value: "2026-11-16" } });
  fireEvent.change(screen.getByLabelText("Select customer"), { target: { value: "customer" } });
  const route = screen.getByLabelText("Route warehouse");
  await waitFor(() => expect(route).toHaveValue("mon"));
  fireEvent.change(deliveryDate, { target: { value: "2026-11-17" } });
  await waitFor(() => expect(route).toHaveValue("tue"));
  const rep = screen.getByLabelText("Sales rep");
  await waitFor(() => expect(rep).toHaveTextContent("Ann Wanjiku"));
  fireEvent.change(rep, { target: { value: "sfa-ann" } });
  expect(rep).toHaveValue("sfa-ann");
  const till = screen.getByLabelText("M-Pesa till");
  expect(till).toHaveDisplayValue("501001");
  fireEvent.change(till, { target: { value: "501003" } });
  expect(till).toHaveDisplayValue("501003");
  fireEvent.change(route, { target: { value: "other" } });
  expect(route).toHaveValue("other");
  expect(till).toHaveDisplayValue("501002");
});

it("keeps routes without collection settings usable during rollout", async () => {
  vi.mocked(fetchWarehouseOptions).mockResolvedValueOnce([{ id: "legacy", label: "Existing route" }]);
  vi.mocked(fetchJoyOrderRoute).mockResolvedValueOnce({ routes: [], saved: false });
  render(<DocumentCreateWizard type="sales-order" />);
  fireEvent.change(screen.getByLabelText("Select customer"), { target: { value: "customer" } });
  await waitFor(() => expect(screen.getByLabelText("Route warehouse")).toHaveTextContent("Existing route"));
  fireEvent.change(screen.getByLabelText("Route warehouse"), { target: { value: "legacy" } });
  expect(screen.getByLabelText("Sales rep")).toBeInTheDocument();
  expect(screen.getByLabelText("M-Pesa till")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(await screen.findByText(/Step 2 of 3/)).toBeInTheDocument();
});

it("lets a Joy order pick from any store except its route, with the dispatch store as the default", async () => {
  vi.mocked(fetchWarehouseOptions).mockResolvedValueOnce([
    { id: "legacy", label: "Existing route" }, { id: "fg", label: "FG - Finished Goods" }, { id: "dispatch", label: "DISPATCH - Dispatch" },
  ]);
  vi.mocked(fetchJoyOrderRoute).mockResolvedValueOnce({ routes: [], saved: false });
  render(<DocumentCreateWizard type="sales-order" />);
  fireEvent.change(screen.getByLabelText("Select customer"), { target: { value: "customer" } });
  const route = screen.getByLabelText("Route warehouse");
  await waitFor(() => expect(route).toHaveTextContent("Existing route"));
  fireEvent.change(route, { target: { value: "legacy" } });
  const source = screen.getByLabelText("Pick from store");
  await waitFor(() => expect(source).toHaveTextContent("FG - Finished Goods"));
  expect(source).toHaveAccessibleName("DISPATCH - Dispatch (default)");
  expect(source).not.toHaveTextContent("Existing route");
  fireEvent.change(source, { target: { value: "fg" } });
  expect(source).toHaveValue("fg");
});
