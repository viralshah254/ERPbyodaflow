import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { DocumentCreateWizard } from "./DocumentCreateWizard";
import { patchDocumentApi } from "@/lib/api/documents";
import { deleteDocumentDraftApi } from "@/lib/api/document-drafts";
import type { DocumentDetailRecord } from "@/lib/types/documents";
const state = vi.hoisted(() => ({ push: vi.fn(), orgId: "org-sfa-6a890b7765042fb41c9d89a6", defaults: vi.fn(), taxDefaults: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/stores/auth-store", () => ({ useAuthStore: (selector: any) => selector({ org: { orgId: state.orgId } }) }));
vi.mock("@/stores/orgContextStore", () => ({ useTerminology: () => ({}), useOrgContextStore: (selector: any) => selector({ templateId: "bakex", orgRole: "MANUFACTURER" }) }));
vi.mock("@/lib/org/useFinancialSettings", () => ({ useFinancialSettings: () => ({ settings: { baseCurrency: "KES", enabledCurrencies: ["KES"] } }) }));
vi.mock("@/lib/copilot-feature", () => ({ useCopilotFeatureEnabled: () => false }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => <select value={value ?? ""} onChange={(event) => onValueChange?.(event.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));
vi.mock("@/lib/api/client", () => ({ isApiConfigured: () => true }));
vi.mock("@/lib/api/documents", () => ({ patchDocumentApi: vi.fn(), createDocumentApi: vi.fn(), previewDocumentPostingApi: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/api/document-drafts", () => ({ deleteDocumentDraftApi: vi.fn() }));
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
vi.mock("@/lib/api/sales-document-flow", () => ({ fetchSalesDocumentFlowApi: vi.fn().mockResolvedValue({ prefillSalesOrderFinishedGoods: true }) }));
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
    return <div data-testid="edit-sheet" data-inline={String(props.sheetFinishedGoods)} data-inclusive={String(props.linesAreTaxInclusive)} data-price-tag={props.priceListId} data-reprice={props.repriceExistingRevision}>
      <button onClick={() => props.onLinesChange((old: any[]) => [...old, { id: "unused", productId: "other", name: "Unused", sku: "2", uom: "PCS", qty: 0, baseQty: 0, price: 50, priceReason: "Price list", amount: 0 }])}>Add zero catalogue row</button>
    </div>;
  } };
});
function doc(type: "sales-order" | "invoice"): DocumentDetailRecord {
  return { attachments: [], comments: [], approvalHistory: [], auditHistory: [], id: "synthetic-doc", type, number: "QA-EDIT", status: "DRAFT", date: "2026-11-09", partyId: "customer", party: "Synthetic QA customer", currency: "KES", total: 86.2, priceListId: "stored", taxConfigId: "stored-tax", linesAreTaxInclusive: true,
    lines: [{ id: "original-line", productId: "queen", productSku: "1", description: "Queen cakes", qty: 2, unit: "PCS", unitPrice: 43.1, amount: 86.2, tax: 11.89, taxCodeId: "vat" }] };
}
beforeEach(() => { vi.mocked(patchDocumentApi).mockReset().mockResolvedValue(doc("invoice")); state.push.mockClear(); state.defaults.mockClear(); state.taxDefaults.mockClear(); });
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
