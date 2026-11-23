import { apiRequest, requireLiveApi } from "./client";

export type PartySiteType = "BRANCH" | "DEPOT" | "OUTLET";

export type PartySiteRow = {
  id: string;
  partyId: string;
  siteType: PartySiteType;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  status: string;
};

export type PartySitePayload = {
  partyId: string;
  siteType?: PartySiteType;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: PartySiteRow["address"];
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export async function fetchPartySitesApi(params?: {
  partyId?: string;
  status?: string;
  limit?: number;
  search?: string;
  cursor?: string | null;
}): Promise<{ items: PartySiteRow[]; nextCursor: string | null }> {
  requireLiveApi("party sites");
  const qs = new URLSearchParams();
  if (params?.partyId) qs.set("partyId", params.partyId);
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  if (params?.cursor) qs.set("cursor", params.cursor);
  const query = qs.toString();
  const data = await apiRequest<{ items: PartySiteRow[]; nextCursor?: string | null }>(
    `/api/party-sites${query ? `?${query}` : ""}`
  );
  return { items: data.items ?? [], nextCursor: data.nextCursor ?? null };
}

export async function fetchPartySiteApi(id: string): Promise<PartySiteRow> {
  requireLiveApi("party site");
  return apiRequest<PartySiteRow>(`/api/party-sites/${id}`);
}

export async function createPartySiteApi(payload: PartySitePayload): Promise<{ id: string }> {
  requireLiveApi("create party site");
  return apiRequest<{ id: string }>("/api/party-sites", { method: "POST", body: payload });
}

export async function updatePartySiteApi(id: string, payload: Partial<PartySitePayload>): Promise<PartySiteRow> {
  requireLiveApi("update party site");
  return apiRequest<PartySiteRow>(`/api/party-sites/${id}`, { method: "PATCH", body: payload });
}
