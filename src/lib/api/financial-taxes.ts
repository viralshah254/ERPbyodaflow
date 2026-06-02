import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { TaxRow } from "@/lib/types/taxes";

type BackendTaxRow = {
  id: string;
  code: string;
  name: string;
  rate?: number;
  type?: string;
};

function mapTaxRow(item: BackendTaxRow): TaxRow {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    rate: item.rate ?? 0,
    inclusive: false,
    effectiveFrom: "",
    effectiveTo: null,
  };
}

export async function fetchFinancialTaxesApi(): Promise<TaxRow[]> {
  requireLiveApi("Financial taxes");
  const payload = await apiRequest<{ items: BackendTaxRow[] }>("/api/settings/financial/taxes");
  return (payload.items ?? []).map(mapTaxRow);
}

export async function createFinancialTaxApi(payload: {
  code: string;
  name: string;
  rate: number;
  type?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create financial tax");
  return apiRequest<{ id: string }>("/api/settings/financial/taxes", {
    method: "POST",
    body: payload,
  });
}

export async function updateFinancialTaxApi(
  id: string,
  payload: { code?: string; name?: string; rate?: number; type?: string }
): Promise<{ id: string }> {
  requireLiveApi("Update financial tax");
  return apiRequest<{ id: string }>(`/api/settings/financial/taxes/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteFinancialTaxApi(id: string): Promise<void> {
  requireLiveApi("Delete financial tax");
  await apiRequest(`/api/settings/financial/taxes/${id}`, { method: "DELETE" });
}
