import { apiRequest, getApiBase, requireLiveApi } from "./client";

export type OdaflowIntegrationApiResponse = {
  orgId: string;
  mappingProfileId: string;
  isActive: boolean;
  allowedManufacturerId: string;
  apiKeyConfigured: boolean;
  hmacSecretConfigured: boolean;
  lastSyncAt: string | null;
  totalEventsProcessed: number;
  recentFailureCount: number;
  enabledEvents: string[];
  inboundBaseUrl: string | null;
  ordersUrl: string | null;
  customersUrl: string | null;
  productsUrl: string | null;
  queueSummary: {
    pending: number;
    processing: number;
    resolved: number;
    failed: number;
    ignored: number;
  };
};

export type OdaflowCredentialsApiResponse = {
  apiKey: string;
  hmacSecret: string;
  orgId: string;
  mappingProfileId: string;
  allowedManufacturerId: string;
  copyNotice: string;
  settings: OdaflowIntegrationApiResponse;
};

export async function fetchOdaflowIntegrationApi(): Promise<OdaflowIntegrationApiResponse> {
  requireLiveApi("Odaflow integration");
  return apiRequest<OdaflowIntegrationApiResponse>("/api/settings/integrations/odaflow");
}

export async function updateOdaflowIntegrationApi(
  patch: Partial<Pick<OdaflowIntegrationApiResponse, "isActive" | "allowedManufacturerId">> & {
    hmacSecret?: string;
  }
): Promise<OdaflowIntegrationApiResponse> {
  requireLiveApi("Odaflow integration");
  return apiRequest<OdaflowIntegrationApiResponse>("/api/settings/integrations/odaflow", {
    method: "PATCH",
    body: patch,
  });
}

export async function generateOdaflowCredentialsApi(input: {
  allowedManufacturerId: string;
  rotate?: boolean;
}): Promise<OdaflowCredentialsApiResponse> {
  requireLiveApi("Odaflow integration");
  return apiRequest<OdaflowCredentialsApiResponse>(
    "/api/settings/integrations/odaflow/generate-credentials",
    {
      method: "POST",
      body: input,
    }
  );
}

export function getErpApiBaseFromFrontend(): string {
  return getApiBase() ?? "";
}
