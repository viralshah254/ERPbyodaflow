import { apiRequest, requireLiveApi } from "@/lib/api/client";
import type { IncotexSignableDocType, KraSigningRecord } from "@/lib/kra/kra-signing";

export type KraConnectionKind = "incotex" | "etims_oscu" | "none";

export type KraIncotexStatus = {
  enabled: boolean;
  bridgeBaseUrl?: string | null;
  vatMode?: string;
  authorizationConfigured?: boolean;
};

export type KraEtimsStatus = {
  enabled: boolean;
  provider: "etims_oscu";
  environment: "sandbox" | "production";
  deviceSerial?: string | null;
  bhfId?: string | null;
  cmcKeyConfigured?: boolean;
  initializedAt?: string | null;
  lastHandshakeAt?: string | null;
  lastHandshakeMessage?: string | null;
  lastInvcNo?: number;
  sdcId?: string | null;
  encryptionConfigured?: boolean;
  updatedAt?: string | null;
};

export type KraIntegrationApiResponse = {
  connection: KraConnectionKind;
  orgTaxId: string | null;
  incotex: KraIncotexStatus;
  etims: KraEtimsStatus;
  lastSigned: {
    documentNumber?: string;
    typeKey?: string;
    signedAt?: string | null;
    provider?: string | null;
  } | null;
};

export async function fetchKraIntegrationApi(): Promise<KraIntegrationApiResponse> {
  requireLiveApi("KRA integration settings");
  return apiRequest<KraIntegrationApiResponse>("/api/settings/integrations/kra");
}

export async function updateKraIntegrationApi(patch: {
  enabled?: boolean;
  environment?: "sandbox" | "production";
  deviceSerial?: string;
  bhfId?: string;
  cmcKey?: string;
  orgTaxId?: string;
}): Promise<KraIntegrationApiResponse> {
  requireLiveApi("Update KRA integration");
  return apiRequest<KraIntegrationApiResponse>("/api/settings/integrations/kra", {
    method: "PATCH",
    body: patch,
  });
}

export async function testKraEtimsConnectionApi(): Promise<{
  ok: boolean;
  message: string;
  taxpayerName?: string | null;
}> {
  requireLiveApi("Test KRA eTIMS connection");
  return apiRequest("/api/settings/integrations/kra/test", { method: "POST" });
}

export async function initializeKraEtimsDeviceApi(): Promise<{
  ok: boolean;
  message: string;
  taxpayerName?: string | null;
  sdcId?: string | null;
  cmcKeyConfigured?: boolean;
}> {
  requireLiveApi("Initialize KRA eTIMS device");
  return apiRequest("/api/settings/integrations/kra/initialize-device", { method: "POST" });
}

export async function retryKraDocumentApi(
  typeKey: IncotexSignableDocType,
  documentId: string
): Promise<{ kraSigning: KraSigningRecord }> {
  return apiRequest<{ kraSigning: KraSigningRecord }>(
    `/api/kra/retry/${encodeURIComponent(typeKey)}/${encodeURIComponent(documentId)}`,
    { method: "POST" }
  );
}

export async function retryKraQueueApi(): Promise<{ retried: number }> {
  return apiRequest<{ retried: number }>("/api/kra/retry-queue", { method: "POST" });
}

export async function retryEtimsDocumentApi(
  typeKey: IncotexSignableDocType,
  documentId: string
): Promise<{ kraSigning: KraSigningRecord }> {
  return apiRequest<{ kraSigning: KraSigningRecord }>(
    `/api/kra/etims/retry/${encodeURIComponent(typeKey)}/${encodeURIComponent(documentId)}`,
    { method: "POST" }
  );
}

export async function retryEtimsQueueApi(): Promise<{ retried: number }> {
  return apiRequest<{ retried: number }>("/api/kra/etims/retry-queue", { method: "POST" });
}
