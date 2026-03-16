import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { UomDefinition } from "@/lib/products/types";

type BackendUom = {
  id: string;
  code: string;
  name: string;
  baseRatio?: number;
};

function mapUom(item: BackendUom): UomDefinition {
  const baseRatio = item.baseRatio ?? 1;
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: "count",
    isBase: baseRatio === 1,
    decimals: 0,
    ...(baseRatio !== 1 && { factorToBase: baseRatio, baseUom: "EA" }),
  };
}

export async function fetchUomsApi(): Promise<UomDefinition[]> {
  requireLiveApi("UOM catalog");
  const payload = await apiRequest<{ items: BackendUom[] }>("/api/settings/uom");
  return (payload.items ?? []).map(mapUom);
}

export async function createUomApi(body: { code: string; name?: string; baseRatio?: number }): Promise<{ id: string }> {
  requireLiveApi("Create UOM");
  return apiRequest<{ id: string }>("/api/settings/uom", {
    method: "POST",
    body: {
      code: body.code.toUpperCase(),
      name: body.name ?? body.code,
      baseRatio: body.baseRatio ?? 1,
    },
  });
}

export async function updateUomApi(
  id: string,
  body: Partial<{ code: string; name: string; baseRatio: number }>
): Promise<void> {
  requireLiveApi("Update UOM");
  const patch: Record<string, unknown> = {};
  if (body.code !== undefined) patch.code = body.code.toUpperCase();
  if (body.name !== undefined) patch.name = body.name;
  if (body.baseRatio !== undefined) patch.baseRatio = body.baseRatio;
  await apiRequest(`/api/settings/uom/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}
