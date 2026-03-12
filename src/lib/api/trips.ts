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

const STORAGE_KEY = "odaflow_coolcatch_trips";

function listParams(p?: Record<string, string | undefined>): Record<string, string> {
  if (!p) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v != null && v !== "") out[k] = v;
  return out;
}

function loadMockTrips(): TripRow[] {
  if (typeof window === "undefined") return getMockTrips();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getMockTrips();
    return JSON.parse(raw) as TripRow[];
  } catch {
    return getMockTrips();
  }
}

function saveMockTrips(rows: TripRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

export async function fetchTrips(params?: { type?: TripType; status?: TripStatus }): Promise<TripRow[]> {
  if (!isApiConfigured()) {
    let rows = loadMockTrips();
    if (params?.type) rows = rows.filter((t) => t.type === params.type);
    if (params?.status) rows = rows.filter((t) => t.status === params.status);
    return rows;
  }
  const q = listParams(
    params ? { type: params.type, status: params.status } : undefined
  );
  const res = await apiRequest<{ items: TripRow[] }>("/api/distribution/trips", {
    params: Object.keys(q).length ? q : undefined,
  });
  return res?.items ?? [];
}

export async function fetchTripById(id: string): Promise<TripRow | null> {
  if (!isApiConfigured()) return loadMockTrips().find((t) => t.id === id) ?? null;
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
    const row: TripRow = {
      id: `mock-trip-${Date.now()}`,
      reference: body.reference ?? `TRIP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
      type: body.type,
      vehicleMode: body.vehicleMode,
      vehicleCode: body.vehicleMode === "LEASED" ? "LEASED-FLEET" : undefined,
      plannedAt: body.plannedAt,
      status: "PLANNED",
      totalCost: 0,
      currency: "KES",
      costLines: [],
    };
    saveMockTrips([row, ...loadMockTrips()]);
    return Promise.resolve({ id: row.id });
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
    const costId = `mock-cost-${Date.now()}`;
    const rows = loadMockTrips().map((trip) => {
      if (trip.id !== tripId) return trip;
      const costLines = [
        ...(trip.costLines ?? []),
        {
          id: costId,
          costType: body.costType,
          amount: body.amount,
          currency: body.currency,
          reference: body.reference,
        },
      ];
      return {
        ...trip,
        costLines,
        totalCost: costLines.reduce((acc, line) => acc + line.amount, 0),
      };
    });
    saveMockTrips(rows);
    return Promise.resolve({ id: costId });
  }
  return apiRequest<{ id: string }>(`/api/distribution/trips/${encodeURIComponent(tripId)}/costs`, {
    method: "POST",
    body,
  });
}
