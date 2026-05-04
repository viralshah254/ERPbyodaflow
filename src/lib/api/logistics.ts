/**
 * Outbound logistics: fuel audit, DN allocation read, vehicle period close.
 */
import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type DistributionVehicleRow = {
  id: string;
  code: string;
  name?: string;
  type?: string;
  monthlyCost?: number;
  assumedTripsPerMonth?: number;
  registration?: string;
  currency?: string;
};

export async function fetchDistributionVehicles(params?: {
  type?: string;
  active?: boolean;
}): Promise<DistributionVehicleRow[]> {
  requireLiveApi("Distribution vehicles");
  const query: Record<string, string> = {};
  if (params?.type) query.type = params.type;
  if (params?.active !== undefined) query.active = params.active ? "true" : "false";
  const res = await apiRequest<{ items: DistributionVehicleRow[] }>("/api/distribution/vehicles", {
    params: Object.keys(query).length ? query : undefined,
  });
  return res?.items ?? [];
}

export type FuelEventRow = {
  id: string;
  vehicleId: string;
  tripId?: string;
  odometerKm?: number;
  litres?: number;
  amount: number;
  currency?: string;
  recordedAt: string;
  note?: string;
};

export async function fetchFuelEvents(params?: {
  vehicleId?: string;
  tripId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<FuelEventRow[]> {
  requireLiveApi("Fuel events");
  const q: Record<string, string> = {};
  if (params?.vehicleId) q.vehicleId = params.vehicleId;
  if (params?.tripId) q.tripId = params.tripId;
  if (params?.dateFrom) q.dateFrom = params.dateFrom;
  if (params?.dateTo) q.dateTo = params.dateTo;
  const res = await apiRequest<{ items: FuelEventRow[] }>("/api/distribution/fuel-events", {
    params: Object.keys(q).length ? q : undefined,
  });
  return res?.items ?? [];
}

export type OutboundLogisticsAllocationRow = {
  id: string;
  orgId?: string;
  tripId?: string;
  deliveryNoteId?: string;
  lineId?: string;
  vehicleId?: string;
  periodKey?: string;
  provisionalKes?: number;
  adjustmentKes?: number;
  finalKes?: number;
};

export async function fetchOutboundLogisticsForDeliveryNote(dnId: string): Promise<{
  items: OutboundLogisticsAllocationRow[];
  totalsByLineId: Record<string, number>;
}> {
  requireLiveApi("Outbound logistics for delivery note");
  return apiRequest(`/api/distribution/outbound-logistics/delivery-note/${encodeURIComponent(dnId)}`);
}

export async function closeLogisticsVehiclePeriod(body: {
  vehicleId: string;
  periodKey: string;
}): Promise<{ periodId: string; varianceKes: number; postingBatchId?: string }> {
  requireLiveApi("Close logistics vehicle period");
  return apiRequest("/api/distribution/logistics/close-vehicle-period", {
    method: "POST",
    body,
  });
}
