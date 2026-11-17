import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ChequeBatchInput, ChequeBatchPreview } from "@/lib/api/ar-cheque-reconciliation";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), confirm: vi.fn(), advice: vi.fn() }));
vi.mock("@/lib/api/ar-cheque-reconciliation", () => ({
  previewArChequeBatch: mocks.preview, confirmArChequeBatch: mocks.confirm, fetchArCheques: vi.fn(),
}));
vi.mock("@/lib/api/document-hub", () => ({ fetchHubDocument: mocks.advice }));
vi.mock("@/lib/org/useBaseCurrency", () => ({ useBaseCurrency: () => "KES" }));
vi.mock("@/components/finance/ArReconciliationSheet", () => ({
  AdvicePicker: () => <div>Choose advice</div>,
  AdvicePreview: () => <div>Original advice</div>,
}));
vi.mock("@/components/documents/DocumentHubUploadButton", () => ({ DocumentHubUploadButton: () => <button>Upload advice</button> }));
vi.mock("@/components/ui/async-searchable-select", () => ({ AsyncSearchableSelect: () => <div>Search</div> }));

import { ArChequeBatchSheet } from "./ArChequeBatchSheet";

afterEach(cleanup);

describe("cheque batch workbench", () => {
  it("reviews a split across new and existing cheques, with grouped money and separate balances", async () => {
    const date = "2026-11-16";
    mocks.advice.mockResolvedValue({ _id: "advice", documentType: "remittance_advice", fileName: "Advice.pdf", fields: { partyId: "customer", currency: "KES" } });
    mocks.preview.mockImplementation((input: ChequeBatchInput): ChequeBatchPreview => ({
      snapshot: "snapshot",
      chequeRows: [
        { key: input.cheques[0].key, paymentId: "existing", receiptNumber: "RCPT-1", chequeNumber: "000842", amount: 60000, available: 60000 },
        { key: input.cheques[1].key, chequeNumber: "000843", amount: 44000, available: 44000 },
      ],
      invoices: [
        { id: "invoice1", number: "INV-1", date, type: "invoice", outstanding: 60000 },
        { id: "invoice2", number: "INV-2", date, type: "invoice", outstanding: 45000 },
      ],
      credits: [{ id: "credit", number: "CRN-1", date, type: "credit-note", outstanding: 5000, sourceInvoiceId: "invoice1" }],
      advice: { id: "advice", fileId: "file", fileName: "Advice.pdf", remittanceLines: [] },
      suggested: {
        targets: [{ documentId: "invoice1", amount: 55000 }, { documentId: "invoice2", amount: 45000 }],
        allocations: [
          { chequeKey: input.cheques[0].key, documentId: "invoice1", amount: 55000 },
          { chequeKey: input.cheques[0].key, documentId: "invoice2", amount: 5000 },
          { chequeKey: input.cheques[1].key, documentId: "invoice2", amount: 40000 },
        ],
        creditNoteApplications: [{ creditNoteId: "credit", invoiceId: "invoice1", amount: 5000 }],
        issues: [],
      },
    }));
    mocks.confirm.mockResolvedValue({ receipts: [{ id: "existing", number: "RCPT-1" }, { id: "new", number: "RCPT-2" }] });
    const onSaved = vi.fn();
    render(<ArChequeBatchSheet
      initialPayment={{ id: "existing", number: "RCPT-1", date, customerId: "customer", customerName: "Test Retailer",
        amount: 60000, currency: "KES", status: "POSTED", paymentMethod: "CHEQUE", chequeNumber: "000842" }}
      initialAdviceId="advice" bankAccounts={[{ id: "bank", name: "Bank A", accountNumber: "1", bank: "A", currency: "KES", active: true }]}
      onClose={vi.fn()} onSaved={onSaved}
    />);
    await screen.findByText("Advice.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Add new cheque" }));
    fireEvent.change(screen.getByLabelText("Cheque number"), { target: { value: "000843" } });
    const amount = screen.getByRole("textbox", { name: "Amount for new cheque 2" });
    fireEvent.change(amount, { target: { value: "44000" } });
    fireEvent.blur(amount);
    expect(amount).toHaveValue("44,000.00");
    fireEvent.click(screen.getByRole("button", { name: "Prepare split" }));
    const allocation = await screen.findByRole("textbox", { name: "Cheque 000843 on INV-2" });
    expect(allocation).toHaveValue("40,000.00");
    const chequeBalances = screen.getByRole("complementary", { name: "Cheque balances and advice" });
    expect(within(chequeBalances).getByText(/^KES 4,000\.00$/)).toBeInTheDocument();
    fireEvent.change(allocation, { target: { value: "41,000.00" } });
    expect(screen.getByRole("button", { name: "Review batch" })).toBeDisabled();
    fireEvent.change(allocation, { target: { value: "40,000.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Review batch" }));
    expect(screen.getByText("CRN-1")).toBeInTheDocument();
    expect(mocks.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm batch" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(screen.getByRole("heading", { name: "Reconciliation confirmed" })).toBeInTheDocument();
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      adviceId: "advice",
      cheques: [{ key: "existing", paymentId: "existing" }, expect.objectContaining({ chequeNumber: "000843", amount: 44000 })],
      creditNoteApplications: [{ creditNoteId: "credit", invoiceId: "invoice1", amount: 5000 }],
    }));
  });
});
