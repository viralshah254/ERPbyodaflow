import { apiRequest, getApiBase, requireLiveApi } from "./client";

export type CoolcatchShopRowDto = {
  erp_shop_id: string;
  location: string;
  wa_phone_e164: string;
  outlet_org_id: string;
  branch_id?: string;
};

export type CoolcatchBotIntegrationApiResponse = {
  enabled: boolean;
  shops: CoolcatchShopRowDto[];
  autoApproveSalesOrders: boolean;
  integrationUserId?: string;
  integrationUserName?: string;
  apiKeyConfigured: boolean;
  hmacSecretConfigured: boolean;
  publicConfigSourceOrgId: string | null;
  thisOrgDrivesPublicApi: boolean;
  ordersWebhookUrl: string | null;
  productsUrl: string | null;
  pricesUrlPattern: string | null;
};

export async function fetchCoolcatchBotIntegrationApi(): Promise<CoolcatchBotIntegrationApiResponse> {
  requireLiveApi("Coolcatch bot integration");
  return apiRequest<CoolcatchBotIntegrationApiResponse>("/api/settings/integrations/coolcatch-bot");
}

export async function updateCoolcatchBotIntegrationApi(
  patch: Partial<
    Pick<
      CoolcatchBotIntegrationApiResponse,
      | "enabled"
      | "shops"
      | "autoApproveSalesOrders"
      | "integrationUserId"
      | "integrationUserName"
    > & {
      apiKey?: string;
      hmacSecret?: string;
    }
  >
): Promise<CoolcatchBotIntegrationApiResponse> {
  requireLiveApi("Coolcatch bot integration");
  return apiRequest<CoolcatchBotIntegrationApiResponse>("/api/settings/integrations/coolcatch-bot", {
    method: "PATCH",
    body: patch,
  });
}

/** Client-side API base for docs when server has no PUBLIC_API_BASE_URL */
export function getCoolcatchApiBaseFromFrontend(): string {
  return getApiBase() ?? "";
}
