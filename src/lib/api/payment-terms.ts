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

export async function createPaymentTermApi(input: {
  code: string;
  name: string;
  method: PaymentTermRow["method"];
  days?: number;
  graceDays?: number;
}): Promise<PaymentTermRow> {
  requireLiveApi("Payment terms");
  return apiRequest<PaymentTermRow>("/api/settings/payment-terms", {
    method: "POST",
    body: input,
  });
}

export async function updatePaymentTermApi(
  id: string,
  patch: Partial<{ code: string; name: string; method: PaymentTermRow["method"]; days: number; graceDays: number; isActive: boolean }>
): Promise<PaymentTermRow> {
  requireLiveApi("Payment terms");
  return apiRequest<PaymentTermRow>(`/api/settings/payment-terms/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}
