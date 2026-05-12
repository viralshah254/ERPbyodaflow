/**
 * Logistics trips API.
 * See BACKEND_SPEC_COOL_CATCH.md §3.8.
 */

import { apiRequest, requireLiveApi } from "@/lib/api/client";
import {
  type TripRow,
  type TripType,
  type TripStatus,
  type TripCostLineRow,
} from "@/lib/mock/distribution/trips";

export type { TripRow, TripType, TripStatus, TripCostLineRow };

function listParams(p?: Record<string, string | undefined>): Record<string, string> {
  if (!p) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v != null && v !== "") out[k] = v;
  return out;
}

export async function fetchTrips(params?: { type?: TripType; status?: TripStatus }): Promise<TripRow[]> {
  requireLiveApi("Distribution trips");
  const q = listParams(
    params ? { type: params.type, status: params.status } : undefined
  );
  const res = await apiRequest<{ items: TripRow[] }>("/api/distribution/trips", {
    params: Object.keys(q).length ? q : undefined,
  });
  return res?.items ?? [];
}

export async function fetchTripById(id: string): Promise<TripRow | null> {
  requireLiveApi("Distribution trip detail");
  try {
    return await apiRequest<TripRow>(`/api/distribution/trips/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export interface CreateTripRequest {
  type: TripType;
  vehicleMode: "LEASED" | "SPOT_HIRE";
  vehicleId?: string;
  carrier?: string;
  reference?: string;
  plannedAt: string;
  deliveryNoteIds?: string[];
}

export async function createTrip(body: CreateTripRequest): Promise<{ id: string; reference: string }> {
  requireLiveApi("Create distribution trip");
  return apiRequest<{ id: string; reference: string }>("/api/distribution/trips", {
    method: "POST",
    body,
  });
}

export async function patchTrip(
  id: string,
  patch: Partial<{ status: TripStatus; deliveryNoteIds: string[]; vehicleId: string; carrier: string; reference: string }>
): Promise<TripRow> {
  requireLiveApi("Patch distribution trip");
  return apiRequest<TripRow>(`/api/distribution/trips/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function fetchNextTripReference(): Promise<string> {
  requireLiveApi("Next trip reference");
  const res = await apiRequest<{ reference: string }>("/api/distribution/trips/next-reference");
  return res.reference;
}

export type OpenDeliveryNoteRow = {
  id: string;
  number: string;
  customer?: string;
  status: string;
  total?: number;
  currency?: string;
};

export async function fetchOpenDeliveryNotes(): Promise<OpenDeliveryNoteRow[]> {
  requireLiveApi("Open delivery notes");
  const res = await apiRequest<{ items: Array<{ id: string; number: string; party?: string; status: string; total?: number; currency?: string }> }>("/api/docs/delivery-note", {
    params: { status: "APPROVED,IN_TRANSIT", limit: "100" },
  });
  return (res?.items ?? []).map((d) => ({
    id: d.id,
    number: d.number,
    customer: d.party,
    status: d.status,
    total: d.total,
    currency: d.currency,
  }));
}

export interface AddTripCostRequest {
  costType: "FUEL" | "DRIVER" | "HIRE_FEE" | "TOLL" | "OTHER" | "LEASE_CHARGE";
  amount: number;
  currency: string;
  reference?: string;
}

export async function addTripCost(tripId: string, body: AddTripCostRequest): Promise<{ id: string }> {
  requireLiveApi("Add trip cost");
  return apiRequest<{ id: string }>(`/api/distribution/trips/${encodeURIComponent(tripId)}/costs`, {
    method: "POST",
    body,
  });
}
