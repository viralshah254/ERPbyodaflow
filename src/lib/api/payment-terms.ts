import { apiRequest, requireLiveApi } from "./client";

export type PaymentTermRow = {
  id: string;
  code: string;
  name: string;
  method: "NET_DAYS" | "EOM_PLUS_DAYS" | "IMMEDIATE";
  days: number;
  graceDays: number;
  isActive: boolean;
};

export async function fetchPaymentTermsApi(): Promise<PaymentTermRow[]> {
  requireLiveApi("Payment terms");
  const payload = await apiRequest<{ items: PaymentTermRow[] }>("/api/settings/payment-terms");
  return payload.items ?? [];
}
