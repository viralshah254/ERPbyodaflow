import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { KenyaWhtCode } from "@/lib/types/tax-kenya";

type BackendTaxCode = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

export async function fetchWithholdingCodesApi(): Promise<KenyaWhtCode[]> {
  requireLiveApi("Withholding tax codes");
  const payload = await apiRequest<{ items: BackendTaxCode[] }>("/api/settings/tax/withholding");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    rate: item.rate,
    applyOnApInvoice: true,
    applyOnApPayment: false,
  }));
}

export async function createWithholdingCodeApi(payload: Pick<KenyaWhtCode, "code" | "name" | "rate">): Promise<void> {
  requireLiveApi("Create withholding tax code");
  await apiRequest("/api/settings/tax/withholding", {
    method: "POST",
    body: payload,
  });
}
