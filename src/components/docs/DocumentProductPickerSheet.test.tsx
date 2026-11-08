import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentProductPickerSheet } from "./DocumentProductPickerSheet";
import { fetchProductsPageApi } from "@/lib/api/products";
vi.mock("@/lib/api/products", () => ({ fetchProductsPageApi: vi.fn() }));
describe("selling product picker", () => {
  it("retains code-only server matches and alphanumeric finished goods with visible identifiers", async () => {
    vi.mocked(fetchProductsPageApi).mockImplementation(async (opts) => ({ items: [opts?.search
      ? { id: "loaf", name: "Loaf", sku: "FG-LOAF", code: "00012", barcode: "6164000350382", productType: "BOTH", itemRole: "FINISHED" }
      : { id: "old", name: "Old loaf", sku: "FG-OLD", code: "999", itemRole: "FINISHED" }], hasMore: false, nextCursor: null }) as never);
    const onConfirm = vi.fn();
    render(<DocumentProductPickerSheet onConfirm={onConfirm} open onOpenChange={() => {}} productFilter="sellable" plantCatalogue sheetFinishedGoods />);
    await screen.findByText("Old loaf");
    fireEvent.change(screen.getByPlaceholderText("Search name, product code, SKU or barcode…"), { target: { value: "00012" } });
    fireEvent.keyDown(screen.getByPlaceholderText("Search name, product code, SKU or barcode…"), { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(fetchProductsPageApi).toHaveBeenCalledWith(expect.objectContaining({ search: "00012", sellable: true })));
    expect(screen.getByText("Loaf")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByPlaceholderText("Search name, product code, SKU or barcode…"), { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ code: "00012" })]);
    expect(screen.getByText(/Code 00012/)).toHaveTextContent("SKU FG-LOAF");
    expect(screen.getByText(/Code 00012/)).toHaveTextContent("Barcode 6164000350382");
    expect(vi.mocked(fetchProductsPageApi).mock.calls.every(([opts]) => !opts?.numericItemCode)).toBe(true);
  });
});
