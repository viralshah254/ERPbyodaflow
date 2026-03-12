import { MOCK_AP_PAYMENTS, type APPaymentRow } from "@/lib/mock/ap";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const KEY = "odaflow_ap_payments";

function seedPayments(): APPaymentRow[] {
  return MOCK_AP_PAYMENTS.map((row) => ({ ...row }));
}

export function listApPayments(): APPaymentRow[] {
  return loadStoredValue(KEY, seedPayments).map((row) => ({ ...row }));
}

export function createApPayment(body: {
  party: string;
  amount: number;
}): APPaymentRow {
  const created: APPaymentRow = {
    id: `app-${Date.now()}`,
    number: `PAY-AP-${String(listApPayments().length + 1).padStart(3, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    party: body.party,
    amount: body.amount,
    status: "POSTED",
  };
  saveStoredValue(KEY, [created, ...listApPayments()]);
  return created;
}

