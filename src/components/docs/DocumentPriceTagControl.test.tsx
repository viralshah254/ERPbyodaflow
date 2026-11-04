import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DocumentPriceTagControl } from "./DocumentPriceTagControl";
import { patchDocumentApi } from "@/lib/api/documents";
vi.mock("@/lib/api/documents", () => ({ patchDocumentApi: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/api/pricing", () => ({ fetchPriceListsForUi: vi.fn().mockResolvedValue([{ id: "list", name: "Standard" }]), resolveCustomerPriceListApi: vi.fn(), fetchCatalogPricesApi: vi.fn().mockResolvedValue({ items: [{ productId: "product", price: 37.93, uom: "EA", source: "price_list" }] }) }));
vi.mock("@/components/ui/searchable-select", () => ({ SearchableSelect: () => <span>Standard</span> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const line = { id: "line", productId: "product", description: "Choco heart", qty: 100, unit: "EA", unitPrice: 37.93, taxCodeId: "vat16", taxRate: 16, amount: 3793, tax: 606.88 };
beforeEach(() => vi.clearAllMocks());
describe("apply price tag", () => {
  it("saves recomputed VAT and gross line and header totals together", async () => {
    render(<DocumentPriceTagControl docType="invoice" docId="invoice" priceListId="list" status="DRAFT" lines={[line]} onApplied={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(patchDocumentApi).toHaveBeenCalledWith("invoice", "invoice", expect.objectContaining({ subtotal: 3793, tax: 606.88, total: 4399.88, lines: [expect.objectContaining({ amount: 4399.88, tax: 606.88 })] })));
  });
  it("preserves the gross price when the document uses tax-inclusive prices", async () => {
    render(<DocumentPriceTagControl docType="invoice" docId="invoice" priceListId="list" status="DRAFT" lines={[line]} linesAreTaxInclusive onApplied={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(patchDocumentApi).toHaveBeenCalledWith("invoice", "invoice", expect.objectContaining({ total: 3793, tax: 523.17, subtotal: 3269.83 })));
  });
  it("does not save a repriced line when its VAT rate is unavailable", async () => {
    render(<DocumentPriceTagControl docType="invoice" docId="invoice" priceListId="list" status="DRAFT" lines={[{ ...line, taxRate: undefined }]} onApplied={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled());
    expect(patchDocumentApi).not.toHaveBeenCalled();
  });
});
