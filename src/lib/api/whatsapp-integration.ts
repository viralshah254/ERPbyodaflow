import { apiRequest, getApiBase, requireLiveApi } from "./client";

export type WhatsAppIntegrationPlatformHints = {
  verifyTokenConfigured: boolean;
  metaAppSecretConfigured: boolean;
};

export type WhatsAppIntegrationDto = {
  enabled: boolean;
  phoneNumberIds: string[];
  defaultBranchId?: string;
  defaultCountryDial?: string;
  orderCurrency?: string;
  autoApproveSalesOrders: boolean;
  integrationUserId?: string;
  /** True when a Meta access token is stored (token itself is never returned). */
  metaAccessTokenConfigured?: boolean;
  metaCatalogId?: string;
  metaBusinessAccountId?: string;
  catalogLastSyncedAt?: string;
  catalogLastSyncError?: string;
};

export type WhatsAppIntegrationApiResponse = WhatsAppIntegrationDto & {
  webhookCallbackUrl: string | null;
  webhookPath: string;
  platformHints: WhatsAppIntegrationPlatformHints;
};

export async function fetchWhatsAppIntegrationApi(): Promise<WhatsAppIntegrationApiResponse> {
  requireLiveApi("WhatsApp integration settings");
  return apiRequest<WhatsAppIntegrationApiResponse>("/api/settings/integrations/whatsapp");
}

/** Callback URL derived on the client when PUBLIC_API_BASE_URL is not set server-side */
export function getWhatsAppWebhookUrlFromFrontend(): string {
  const base = getApiBase();
  const path = "/api/integrations/whatsapp/webhook";
  return base ? `${base}${path}` : path;
}

export async function updateWhatsAppIntegrationApi(
  patch: Partial<
    Omit<WhatsAppIntegrationApiResponse, "webhookCallbackUrl" | "webhookPath" | "platformHints" | "metaAccessTokenConfigured"> & { metaAccessToken?: string }
  >
): Promise<WhatsAppIntegrationApiResponse> {
  requireLiveApi("WhatsApp integration settings");
  return apiRequest<WhatsAppIntegrationApiResponse>("/api/settings/integrations/whatsapp", {
    method: "PATCH",
    body: patch,
  });
}

export async function syncWhatsAppCatalogApi(): Promise<{ ok: boolean; synced: number }> {
  requireLiveApi("WhatsApp catalog sync");
  return apiRequest<{ ok: boolean; synced: number }>("/api/settings/integrations/whatsapp/sync-catalog", {
    method: "POST",
    body: {},
  });
}
