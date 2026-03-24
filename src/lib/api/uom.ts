import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { UomDefinition } from "@/lib/products/types";

type BackendUom = {
  id: string;
  code: string;
  name: string;
  category?: string;
  decimals?: number;
  isBase?: boolean;
  baseUomCode?: string | null;
  factorToBase?: number | null;
  /** @deprecated kept for old backend compat */
  baseRatio?: number;
};

function mapUom(item: BackendUom): UomDefinition {
  const isBase = item.isBase ?? (!item.baseUomCode);
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: (item.category as UomDefinition["category"]) ?? "count",
    decimals: item.decimals ?? 0,
    isBase: isBase || undefined,
    baseUom: item.baseUomCode ?? undefined,
    factorToBase: item.factorToBase ?? undefined,
  };
}

export async function fetchUomsApi(): Promise<UomDefinition[]> {
  requireLiveApi("UOM catalog");
  const payload = await apiRequest<{ items: BackendUom[] }>("/api/settings/uom");
  return (payload.items ?? []).map(mapUom);
}

/** Fetch UOMs from master-data (allows inventory.read/sales.read). Use on product pages. */
export async function fetchProductUomsApi(): Promise<UomDefinition[]> {
  requireLiveApi("Product UOMs");
  const payload = await apiRequest<{ items: BackendUom[] }>("/api/master-data/product/uoms");
  return (payload.items ?? []).map(mapUom);
}

export async function createUomApi(body: {
  code: string;
  name?: string;
  category?: string;
  decimals?: number;
  isBase?: boolean;
  baseUomCode?: string;
  factorToBase?: number;
}): Promise<{ id: string }> {
  requireLiveApi("Create UOM");
  return apiRequest<{ id: string }>("/api/settings/uom", {
    method: "POST",
    body: {
      code: body.code.toUpperCase(),
      name: body.name ?? body.code,
      category: body.category ?? "count",
      decimals: body.decimals ?? 0,
      isBase: body.isBase ?? true,
      baseUomCode: body.baseUomCode,
      factorToBase: body.factorToBase,
    },
  });
}

export async function updateUomApi(
  id: string,
  body: Partial<{
    name: string;
    category: string;
    decimals: number;
    isBase: boolean;
    baseUomCode: string;
    factorToBase: number;
  }>
): Promise<void> {
  requireLiveApi("Update UOM");
  await apiRequest(`/api/settings/uom/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteUomApi(id: string): Promise<void> {
  requireLiveApi("Delete UOM");
  await apiRequest(`/api/settings/uom/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
