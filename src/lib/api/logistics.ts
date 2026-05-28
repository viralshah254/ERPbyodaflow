/**
 * Outbound logistics: fuel audit, DN allocation read, vehicle period close, lease invoices.
 */
import { apiRequest, requireLiveApi, uploadFormData } from "@/lib/api/client";

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
  vehicleCode?: string;
  vehicleName?: string;
  tripId?: string;
  tripReference?: string;
  tripBatchLabel?: string;
  odometerKm?: number;
  litres?: number;
  amount: number;
  currency?: string;
  recordedAt: string;
  note?: string;
  attachmentIds?: string[];
};

export async function createDistributionVehicle(body: {
  code: string;
  name?: string;
  type: "LEASED" | "SPOT";
  registration?: string;
  monthlyCost?: number;
  assumedTripsPerMonth?: number;
  currency?: string;
}): Promise<{ id: string }> {
  requireLiveApi("Create vehicle");
  return apiRequest("/api/distribution/vehicles", { method: "POST", body });
}

export async function updateDistributionVehicle(
  id: string,
  patch: Partial<{
    code: string;
    name: string;
    type: "LEASED" | "SPOT";
    registration: string;
    monthlyCost: number;
    assumedTripsPerMonth: number;
    currency: string;
    isActive: boolean;
  }>
): Promise<DistributionVehicleRow> {
  requireLiveApi("Update vehicle");
  return apiRequest(`/api/distribution/vehicles/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
}

export async function deleteDistributionVehicle(id: string): Promise<void> {
  requireLiveApi("Delete vehicle");
  await apiRequest(`/api/distribution/vehicles/${encodeURIComponent(id)}`, { method: "DELETE" });
}

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

export async function createFuelEvent(params: {
  vehicleId: string;
  tripId?: string;
  odometerKm: number;
  litres?: number;
  amount: number;
  currency?: string;
  note?: string;
  recordedAt?: string;
  file?: File;
}): Promise<{ id: string }> {
  requireLiveApi("Create fuel event");
  const form = new FormData();
  form.append("vehicleId", params.vehicleId);
  if (params.tripId) form.append("tripId", params.tripId);
  form.append("odometerKm", String(params.odometerKm));
  if (params.litres != null) form.append("litres", String(params.litres));
  form.append("amount", String(params.amount));
  if (params.currency) form.append("currency", params.currency);
  if (params.note) form.append("note", params.note);
  if (params.recordedAt) form.append("recordedAt", params.recordedAt);
  if (params.file) form.append("file", params.file);

  return uploadFormData("/api/distribution/fuel-events", form);
}

export type VehiclePeriodSummary = {
  periodKey: string;
  status: "OPEN" | "CLOSED";
  paymentStatus?: "PENDING_INVOICE" | "READY_TO_PAY" | "PAID";
  invoiceAttachmentId?: string;
  invoiceAmountKes?: number;
  invoiceUploadedAt?: string;
  tripCount?: number;
  leasePerTripKes?: number;
  fuelTotalKes?: number;
  totalDistanceKm?: number;
  paidAt?: string;
};

export function currentPeriodKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function fetchVehiclePeriodSummary(
  vehicleId: string,
  periodKey?: string
): Promise<VehiclePeriodSummary> {
  requireLiveApi("Vehicle period");
  const params: Record<string, string> = {};
  if (periodKey) params.periodKey = periodKey;
  return apiRequest(`/api/distribution/vehicles/${encodeURIComponent(vehicleId)}/periods`, { params });
}

export async function uploadVehiclePeriodInvoice(params: {
  vehicleId: string;
  periodKey: string;
  invoiceAmountKes: number;
  file: File;
}): Promise<{ periodId: string; attachmentId: string }> {
  requireLiveApi("Upload lease invoice");
  const form = new FormData();
  form.append("invoiceAmountKes", String(params.invoiceAmountKes));
  form.append("file", params.file);
  return uploadFormData(
    `/api/distribution/vehicles/${encodeURIComponent(params.vehicleId)}/periods/${encodeURIComponent(params.periodKey)}/invoice`,
    form
  );
}

export async function markVehiclePeriodPaid(params: {
  vehicleId: string;
  periodKey: string;
}): Promise<{ ok: boolean; paymentStatus?: string; paidAt?: string }> {
  requireLiveApi("Mark lease paid");
  return apiRequest(
    `/api/distribution/vehicles/${encodeURIComponent(params.vehicleId)}/periods/${encodeURIComponent(params.periodKey)}/mark-paid`,
    { method: "POST", body: {} }
  );
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
