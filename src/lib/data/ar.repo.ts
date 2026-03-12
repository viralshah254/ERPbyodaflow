import {
  MOCK_OPEN_INVOICES,
  MOCK_PAYMENTS,
  type OpenInvoiceRow,
  type PaymentRow,
} from "@/lib/mock/ar";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const PAYMENTS_KEY = "odaflow_ar_payments";
const INVOICES_KEY = "odaflow_ar_open_invoices";

function seedPayments(): PaymentRow[] {
  return MOCK_PAYMENTS.map((row) => ({ ...row }));
}

function seedInvoices(): OpenInvoiceRow[] {
  return MOCK_OPEN_INVOICES.map((row) => ({ ...row }));
}

export function listArPayments(): PaymentRow[] {
  return loadStoredValue(PAYMENTS_KEY, seedPayments).map((row) => ({ ...row }));
}

export function listOpenInvoices(customerId?: string): OpenInvoiceRow[] {
  let rows = loadStoredValue(INVOICES_KEY, seedInvoices).map((row) => ({ ...row }));
  if (customerId) rows = rows.filter((row) => row.customerId === customerId);
  return rows;
}

export function createArPayment(body: {
  customerId: string;
  customerName: string;
  amount: number;
}): PaymentRow {
  const created: PaymentRow = {
    id: `arp-${Date.now()}`,
    number: `PAY-${String(listArPayments().length + 1).padStart(3, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    customerId: body.customerId,
    customerName: body.customerName,
    amount: body.amount,
    status: "POSTED",
  };
  saveStoredValue(PAYMENTS_KEY, [created, ...listArPayments()]);
  return created;
}

export function allocateArPayment(paymentId: string, allocations: Record<string, number>): void {
  const invoiceIds = Object.keys(allocations).filter((id) => (allocations[id] ?? 0) > 0);
  saveStoredValue(
    INVOICES_KEY,
    listOpenInvoices().map((invoice) => {
      if (!invoiceIds.includes(invoice.id)) return invoice;
      const amount = allocations[invoice.id] ?? 0;
      const allocated = invoice.allocated + amount;
      const outstanding = Math.max(0, invoice.total - allocated);
      return {
        ...invoice,
        allocated,
        outstanding,
        status: outstanding === 0 ? "CLEARED" : "OPEN",
      };
    })
  );
  saveStoredValue(
    PAYMENTS_KEY,
    listArPayments().map((payment) =>
      payment.id === paymentId ? { ...payment, status: "ALLOCATED" } : payment
    )
  );
}

