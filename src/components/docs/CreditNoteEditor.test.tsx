import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CreditNoteEditor } from "./CreditNoteEditor";
import type { DocumentDetailRecord } from "@/lib/types/documents";

vi.mock("@/components/docs/DocumentLineProductDescription", () => ({
  DocumentLineProductDescription: ({ line }: { line: { description: string } }) => <span>{line.description}</span>,
}));

it("reviews partial and full credit in one draft before enabling save", () => {
  const onSave = vi.fn();
  const document: DocumentDetailRecord = {
    id: "credit", type: "credit-note", number: "CN1", date: "2026-11-12", currency: "KES", status: "DRAFT",
    stockAccountingVersion: 1, companyAverageCosting: true,
    sourceDocument: { id: "invoice", typeKey: "invoice", number: "INV1", status: "POSTED", date: "2026-11-11" },
    lines: [{ id: "line", description: "Cookies", qty: 6, amount: 69.6, tax: 9.6, unit: "PCS", creditCapacity: { credited: 4, reserved: 0, available: 6 } }],
    attachments: [], comments: [], approvalHistory: [], auditHistory: [],
  };
  function Draft() {
    const [quantities, setQuantities] = React.useState<Record<string, string>>({});
    const [effect, setEffect] = React.useState<DocumentDetailRecord["adjustmentEffect"]>();
    return <CreditNoteEditor document={document} partyName="Customer" quantities={quantities}
      onQuantity={(id, value) => setQuantities({ [id]: value })} effect={effect ?? ""} onEffect={setEffect}
      warehouse="" onWarehouse={() => {}} editable busy={false} dirty onSave={onSave}
      formatAmount={(value) => `KES ${value.toFixed(2)}`} fmcgOrg={false} />;
  }
  render(<Draft />);
  expect(screen.getByRole("link", { name: "INV1" })).toHaveAttribute("href", "/docs/invoice/invoice");
  const save = screen.getByRole("button", { name: "Save credit draft" });
  const quantity = screen.getByRole("spinbutton", { name: "Quantity to credit for Cookies" });
  expect(save).toBeDisabled();
  fireEvent.click(screen.getByRole("radio", { name: /price correction/i }));
  fireEvent.change(quantity, { target: { value: "3" } });
  expect(screen.getByText("VAT KES 4.80")).toBeInTheDocument();
  fireEvent.change(quantity, { target: { value: "7" } });
  expect(save).toBeDisabled();
  fireEvent.change(quantity, { target: { value: "6" } });
  expect(screen.getByText("VAT KES 9.60")).toBeInTheDocument();
  fireEvent.click(save);
  expect(onSave).toHaveBeenCalledOnce();
});
