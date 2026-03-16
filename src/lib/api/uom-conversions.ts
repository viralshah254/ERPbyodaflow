import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { UomConversion } from "@/lib/products/types";

type BackendConversion = {
  id: string;
  fromUom: string;
  toUom: string;
  factor: number;
  productId?: string;
  isActive?: boolean;
};

function mapConversion(item: BackendConversion): UomConversion {
  return {
    id: item.id,
    fromUom: item.fromUom,
    toUom: item.toUom,
    factor: item.factor,
  };
}

export async function fetchUomConversionsApi(productId?: string): Promise<UomConversion[]> {
  requireLiveApi("UOM conversions");
  const params = new URLSearchParams();
  if (productId) params.set("productId", productId);
  const payload = await apiRequest<{ items: BackendConversion[] }>("/api/master-data/product/uom-conversions", {
    params,
  });
  return (payload.items ?? []).map(mapConversion);
}

export async function createUomConversionApi(payload: {
  fromUom: string;
  toUom: string;
  factor: number;
  productId?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create UOM conversion");
  return apiRequest<{ id: string }>("/api/master-data/product/uom-conversions", {
    method: "POST",
    body: payload,
  });
}

export async function updateUomConversionApi(
  id: string,
  payload: Partial<{ fromUom: string; toUom: string; factor: number; productId?: string; isActive: boolean }>
): Promise<void> {
  requireLiveApi("Update UOM conversion");
  await apiRequest(`/api/master-data/product/uom-conversions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteUomConversionApi(id: string): Promise<void> {
  requireLiveApi("Delete UOM conversion");
  await updateUomConversionApi(id, { isActive: false });
}
