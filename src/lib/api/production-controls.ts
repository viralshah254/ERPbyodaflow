import { apiRequest, requireLiveApi } from "./client";
export type CapacityResource = { _id: string; branchId: string; name: string; workCenterKey: string; revision: number; active: boolean; windows: Array<{ start: string; end: string }> };
export type CapacitySlot = { operationId: string; operationName: string; resourceId: string; resourceName?: string; start: string; end: string };
export type CapacityReservation = CapacitySlot & { _id: string; workOrderId: string; state: string };
export type CapacityInput = { workOrderId: string; notBefore: string; bindings: Array<{ operationId: string; resourceId: string }> };
export type CapacityPreview = { digest: string; slots: CapacitySlot[]; quantity: number; workOrderId: string };
export async function fetchCapacityWorkspace() {
  requireLiveApi("Finite capacity planning");
  const result = await apiRequest<{ contract: string; resources: CapacityResource[]; reservations: CapacityReservation[]; basis: string }>("/api/manufacturing/capacity");
  if (result.contract !== "finite-capacity-v1") throw new Error("Capacity planning requires the updated backend."); return result;
}
export async function previewCapacityApi(input: CapacityInput) { return apiRequest<CapacityPreview>("/api/manufacturing/capacity/preview", { method: "POST", body: input }); }
export async function reserveCapacityApi(input: CapacityInput, previewDigest: string) { return apiRequest("/api/manufacturing/capacity/reserve", { method: "POST", body: { ...input, previewDigest } }); }
export async function releaseCapacityApi(workOrderId: string, reason: string) { return apiRequest("/api/manufacturing/capacity/release", { method: "POST", body: { workOrderId, reason } }); }
export type TrustedDevice = { _id: string; name: string; branchId: string; fingerprint: string; active: boolean; calibrationReference: string; calibrationValidUntil: string; maxAgeSeconds: number };
export type DeviceReading = { _id: string; deviceId: string; workOrderId: string; quantity: number; unit: string; capturedAt: string; state: "PENDING" | "APPROVED" | "REJECTED" | "CONSUMED"; payloadHash: string; reviewedBy?: string; reviewReason?: string };
export async function fetchTrustedDevices(workOrderId?: string) {
  requireLiveApi("Trusted production devices");
  const result = await apiRequest<{ contract: string; devices: TrustedDevice[]; readings: DeviceReading[]; hasMore: boolean }>("/api/manufacturing/trusted-devices", { params: workOrderId ? new URLSearchParams({ workOrderId }) : undefined });
  if (result.contract !== "trusted-devices-v1") throw new Error("Trusted devices require the updated ERP backend."); return result;
}
export async function reviewDeviceReadingApi(id: string, outcome: "APPROVED" | "REJECTED", reason: string) { return apiRequest(`/api/manufacturing/trusted-devices/${encodeURIComponent(id)}/review`, { method: "POST", body: { outcome, reason } }); }
