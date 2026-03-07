/**
 * Logistics trips API — backend when NEXT_PUBLIC_API_URL set, else mocks.
 * See BACKEND_SPEC_COOL_CATCH.md §3.8.
 */

import { apiRequest, isApiConfigured } from "@/lib/api/client";
import {
  getMockTrips,
  getMockTripById,
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
  if (!isApiConfigured()) return getMockTrips(params);
  const q = listParams(
    params ? { type: params.type, status: params.status } : undefined
  );
  const res = await apiRequest<{ items: TripRow[] }>("/api/distribution/trips", {
    params: Object.keys(q).length ? q : undefined,
  });
  return res?.items ?? [];
}

export async function fetchTripById(id: string): Promise<TripRow | null> {
  if (!isApiConfigured()) return getMockTripById(id);
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
  reference?: string;
  plannedAt: string;
}

export async function createTrip(body: CreateTripRequest): Promise<{ id: string }> {
  if (!isApiConfigured()) {
    return Promise.resolve({ id: `mock-trip-${Date.now()}` });
  }
  return apiRequest<{ id: string }>("/api/distribution/trips", {
    method: "POST",
    body,
  });
}

export interface AddTripCostRequest {
  costType: "FUEL" | "DRIVER" | "HIRE_FEE" | "TOLL" | "OTHER";
  amount: number;
  currency: string;
  reference?: string;
}

export async function addTripCost(tripId: string, body: AddTripCostRequest): Promise<{ id: string }> {
  if (!isApiConfigured()) {
    return Promise.resolve({ id: `mock-cost-${Date.now()}` });
  }
  return apiRequest<{ id: string }>(`/api/distribution/trips/${encodeURIComponent(tripId)}/costs`, {
    method: "POST",
    body,
  });
}
