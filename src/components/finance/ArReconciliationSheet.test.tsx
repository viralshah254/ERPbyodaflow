import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ArReconciliation } from "@/lib/api/ar-reconciliation";

const mocks = vi.hoisted(() => ({ load: vi.fn(), confirm: vi.fn(), documents: vi.fn() }));
vi.mock("@/lib/api/ar-reconciliation", () => ({
  fetchArReconciliation: mocks.load,
  confirmArReconciliation: mocks.confirm,
}));
vi.mock("@/lib/api/document-hub", () => ({ fetchDocumentHub: mocks.documents }));
vi.mock("@/components/documents/DocumentHubUploadButton", () => ({ DocumentHubUploadButton: () => <button>Upload advice</button> }));
vi.mock("@/components/documents/DocumentHubPreview", () => ({ DocumentHubPreview: () => <div>Original advice</div> }));

import { ArReconciliationSheet } from "./ArReconciliationSheet";

const date = "2026-11-16T09:00:00Z";
const base: ArReconciliation = {
  receipt: { id: "receipt", number: "RCPT-1", customerId: "customer", customerName: "Test Customer", date, amount: 100, unapplied: 100, currency: "KES", chequeNumber: "000842" },
  invoices: [
    { id: "inv1", number: "INV-1", date, type: "invoice", outstanding: 80 },
    { id: "inv2", number: "INV-2", date, type: "invoice", outstanding: 25 },
  ],
  credits: [{ id: "crn", number: "CRN-1", date, type: "credit-note", outstanding: 5, sourceInvoiceId: "inv1" }],
  advice: null,
  linkedAdvice: [],
  snapshot: "current-balances",
  suggestionReason: "",
  suggested: { allocations: [], creditNoteApplications: [], issues: [] },
};
const advised: ArReconciliation = {
  ...base,
  advice: {
    id: "advice", fileId: "file", fileName: "Advice.pdf", total: 100,
    remittanceLines: [{ invoiceNumber: "INV-1", kind: "invoice", paymentAmount: 80 }],
  },
  suggested: {
    allocations: [{ documentId: "inv1", amount: 75 }, { documentId: "inv2", amount: 25 }],
    creditNoteApplications: [{ creditNoteId: "crn", invoiceId: "inv1", amount: 5 }],
    issues: [],
  },
  suggestionReason: "From the remittance advice",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.load.mockImplementation((_: string, adviceId?: string) => Promise.resolve(adviceId ? advised : base));
  mocks.confirm.mockResolvedValue({ paymentId: "receipt" });
});
afterEach(cleanup);

describe("AR payment reconciliation workbench", () => {
  it("loads a selected Document Hub advice and confirms the reviewed cash and credit split", async () => {
    mocks.documents.mockResolvedValue({ items: [{ _id: "advice", fileName: "Advice.pdf", fields: { partyId: "customer" } }] });
    const onSaved = vi.fn();
    render(<ArReconciliationSheet paymentId="receipt" onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.click(await screen.findByRole("button", { name: "Choose remittance advice" }));
    fireEvent.click(await screen.findByRole("button", { name: "Advice.pdf" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Receipt amount for INV-1" })).toHaveValue("75"));
    expect(screen.getByRole("combobox", { name: "Invoice for CRN-1" })).toHaveValue("inv1");

    fireEvent.change(screen.getByRole("textbox", { name: "Receipt amount for INV-1" }), { target: { value: "80" } });
    expect(screen.getByRole("alert")).toHaveTextContent("exceed an invoice balance");
    expect(screen.getByRole("button", { name: "Review allocation" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Receipt amount for INV-1" }), { target: { value: "70" } });

    fireEvent.click(screen.getByRole("button", { name: "Review allocation" }));
    const review = screen.getByRole("region", { name: "Review allocation" });
    expect(within(review).getByText("CRN-1")).toBeInTheDocument();
    expect(mocks.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm reconciliation" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(mocks.confirm).toHaveBeenCalledWith("receipt", expect.objectContaining({
      adviceId: "advice", snapshot: "current-balances",
      allocations: [{ documentId: "inv1", amount: 70 }, { documentId: "inv2", amount: 25 }],
      creditNoteApplications: [{ creditNoteId: "crn", invoiceId: "inv1", amount: 5 }],
    }));
  });

  it("requires review of advice discrepancies and keeps the same request key on retry", async () => {
    mocks.load.mockResolvedValue({
      ...advised, suggested: { ...advised.suggested, issues: ["Verify the customer on the original advice."] },
    });
    mocks.confirm.mockRejectedValueOnce(new Error("Connection dropped"));
    render(<ArReconciliationSheet paymentId="receipt" initialAdviceId="advice" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Review allocation" }));
    const confirm = screen.getByRole("button", { name: "Confirm reconciliation" });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed these issues/ }));
    fireEvent.click(confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection dropped");
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2));
    expect(mocks.confirm.mock.calls[0][1]).toEqual(mocks.confirm.mock.calls[1][1]);
  });
});
