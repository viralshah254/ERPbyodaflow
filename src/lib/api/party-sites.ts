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
  status?: "ACTIVE" | "INACTIVE";
};

export async function fetchPartySitesApi(params?: {
  partyId?: string;
  status?: string;
}): Promise<{ items: PartySiteRow[] }> {
  requireLiveApi("party sites");
  const qs = new URLSearchParams();
  if (params?.partyId) qs.set("partyId", params.partyId);
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiRequest<{ items: PartySiteRow[] }>(`/api/party-sites${query ? `?${query}` : ""}`);
}

export async function createPartySiteApi(payload: PartySitePayload): Promise<{ id: string }> {
  requireLiveApi("create party site");
  return apiRequest<{ id: string }>("/api/party-sites", { method: "POST", body: JSON.stringify(payload) });
}

export async function updatePartySiteApi(id: string, payload: Partial<PartySitePayload>): Promise<PartySiteRow> {
  requireLiveApi("update party site");
  return apiRequest<PartySiteRow>(`/api/party-sites/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}
