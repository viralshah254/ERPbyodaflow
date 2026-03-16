import type { EntityRow } from "@/lib/types/intercompany";
import { apiRequest, requireLiveApi } from "./client";

export async function fetchEntitiesApi(): Promise<EntityRow[]> {
  requireLiveApi("Organization entities");
  const payload = await apiRequest<{ items: EntityRow[] }>("/api/settings/entities");
  return payload.items ?? [];
}

export async function createEntityApi(payload: Omit<EntityRow, "id">): Promise<{ id: string }> {
  requireLiveApi("Organization entity creation");
  return apiRequest<{ id: string }>("/api/settings/entities", {
    method: "POST",
    body: payload,
  });
}
