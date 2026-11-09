import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReceiptCollectionGrid } from "./ReceiptCollectionGrid";
import { createArPaymentApi, fetchArOpenItemsApi, previewArSettlementApi, createBatchApPaymentApi, fetchApReceiptItemsApi, previewApSettlementApi } from "@/lib/api/payments";
vi.mock("@/lib/org/useBaseCurrency", () => ({ useBaseCurrency: () => "KES" }));
vi.mock("@/lib/api/treasury-ops", () => ({ fetchBankAccountsApi: vi.fn().mockResolvedValue([{ id: "bank", name: "Bank" }]) }));
vi.mock("@/components/ui/searchable-select", () => ({ SearchableSelect: ({ value, onValueChange }: any) => <select aria-label="Bank" value={value} onChange={e => onValueChange(e.target.value)}><option value="" /><option value="bank">Bank</option></select> }));
vi.mock("@/components/ui/async-searchable-select", () => ({ AsyncSearchableSelect: ({ value, onValueChange, emptyMessage }: any) => <><select aria-label="Supplier" value={value} onChange={e => onValueChange(e.target.value)}><option value="" /><option value="supplier">Supplier</option></select><span>{emptyMessage}</span></> }));
vi.mock("@/lib/api/payments", () => ({
  createArPaymentApi: vi.fn(), fetchArOpenItemsApi: vi.fn(), previewArSettlementApi: vi.fn(), searchArCustomerOptionsApi: vi.fn(),
  createBatchApPaymentApi: vi.fn(), fetchApReceiptItemsApi: vi.fn(), previewApSettlementApi: vi.fn(), searchApSupplierOptionsApi: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const item = { id: "bill", number: "BILL-1", outstanding: 100, date: "2026-01-01", customerId: "supplier", customerName: "Supplier", total: 100, allocated: 0, status: "OPEN", sourceType: "invoice" as const };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchApReceiptItemsApi).mockResolvedValue({ invoices: [item], creditNotes: [] });
  vi.mocked(previewApSettlementApi).mockResolvedValue({ invoiceLines: [{ invoiceId: "bill", invoiceNumber: "BILL-1", amount: 100, confidence: 0.4, reason: "Oldest invoice" }], creditNoteApplications: [], cashApplied: 100, creditsApplied: 0, unapplied: 0, flags: [] });
  vi.mocked(createBatchApPaymentApi).mockResolvedValue({ id: "payment", number: "AP-1" });
});
async function fillLine() {
  fireEvent.change(screen.getByLabelText("Bank"), { target: { value: "bank" } });
  fireEvent.change(screen.getAllByLabelText("Supplier")[0], { target: { value: "supplier" } });
  fireEvent.change(screen.getByLabelText("Method 1"), { target: { value: "BANK_TRANSFER" } });
  fireEvent.change(screen.getByLabelText("Reference 1"), { target: { value: "UNRELATED-BANK-REF" } });
  fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "100" } });
  await screen.findByText("BILL-1");
}
describe("batch payouts", () => {
  it("posts an unrelated reference with the reviewed invoice allocation", async () => {
    render(<ReceiptCollectionGrid payout />);
    expect(screen.getAllByText("No suppliers found.").length).toBeGreaterThan(0);
    expect(screen.queryByText("No customers found.")).not.toBeInTheDocument();
    await fillLine();
    fireEvent.click(screen.getByRole("button", { name: "Post payouts" }));
    await waitFor(() => expect(createBatchApPaymentApi).toHaveBeenCalledWith(expect.objectContaining({ customerId: "supplier", amount: 100, bankAccountId: "bank", reference: "UNRELATED-BANK-REF", allocations: [{ documentId: "bill", amount: 100 }] })));
  });
  it("retains failed rows for correction and retry", async () => {
    vi.mocked(createBatchApPaymentApi).mockRejectedValueOnce(new Error("Bill balance changed"));
    render(<ReceiptCollectionGrid payout />);
    await fillLine();
    fireEvent.click(screen.getByRole("button", { name: "Post payouts" }));
    await screen.findByText("Bill balance changed");
    expect(screen.getByLabelText("Amount 1")).toHaveValue(100);
    fireEvent.click(screen.getByRole("button", { name: "Post payouts" }));
    await waitFor(() => expect(createBatchApPaymentApi).toHaveBeenCalledTimes(2));
    const attempts = vi.mocked(createBatchApPaymentApi).mock.calls;
    expect(attempts[0][0].clientRequestId).toBeTruthy();
    expect(attempts[1][0].clientRequestId).toBe(attempts[0][0].clientRequestId);
  });
});

it.each([false, true])("allows an explicit on-account entry in payout=%s without inventing allocations", async (payout) => {
  vi.mocked(fetchArOpenItemsApi).mockResolvedValue({ invoices: [], creditNotes: [] });
  vi.mocked(fetchApReceiptItemsApi).mockResolvedValue({ invoices: [], creditNotes: [] });
  const emptyPreview = { invoiceLines: [], creditNoteApplications: [], cashApplied: 0, creditsApplied: 0, unapplied: 100, flags: [] };
  vi.mocked(previewArSettlementApi).mockResolvedValue(emptyPreview); vi.mocked(previewApSettlementApi).mockResolvedValue(emptyPreview);
  vi.mocked(createArPaymentApi).mockResolvedValue({ id: "receipt", number: "AR-1" });
  render(<ReceiptCollectionGrid payout={payout} />);
  fireEvent.change(screen.getByLabelText("Bank"), { target: { value: "bank" } });
  fireEvent.change(screen.getAllByLabelText("Supplier")[0], { target: { value: "supplier" } });
  fireEvent.change(screen.getByLabelText("Method 1"), { target: { value: "BANK_TRANSFER" } });
  fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "100" } });
  const onAccount = await screen.findByRole("checkbox", { name: "Record line 1 on account" });
  const post = screen.getByRole("button", { name: payout ? "Post payouts" : "Post receipts" });
  fireEvent.click(post);
  await screen.findByText(/Choose invoices or select Record on account/);
  const create = payout ? createBatchApPaymentApi : createArPaymentApi;
  expect(create).not.toHaveBeenCalled();
  fireEvent.click(onAccount);
  fireEvent.change(screen.getByLabelText("Method 1"), { target: { value: "CASH" } });
  expect(onAccount).not.toBeChecked();
  fireEvent.click(onAccount); fireEvent.click(post);
  await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ amount: 100, allocations: [], bankAccountId: "bank" })));
});
