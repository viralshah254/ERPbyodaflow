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
  apiKeyGeneratedAt: string | null;
  apiKeyLastUsedAt: string | null;
  apiKeyCallCount: number;
};

export type CoolcatchShopCandidateDto = {
  outletOrgId: string;
  location: string;
  erpShopId: string;
  suggestedWaPhoneE164: string;
  waPhoneSource: "outlet_admin" | null;
  territory?: string;
  isActive: boolean;
};

export type CoolcatchTestResult = {
  ok: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
};

export async function fetchCoolcatchBotIntegrationApi(): Promise<CoolcatchBotIntegrationApiResponse> {
  requireLiveApi("Coolcatch bot integration");
  return apiRequest<CoolcatchBotIntegrationApiResponse>("/api/settings/integrations/coolcatch-bot");
}

export async function fetchCoolcatchBotOutletCandidatesApi(): Promise<{
  items: CoolcatchShopCandidateDto[];
}> {
  requireLiveApi("Coolcatch bot outlet candidates");
  return apiRequest<{ items: CoolcatchShopCandidateDto[] }>(
    "/api/settings/integrations/coolcatch-bot/outlet-candidates"
  );
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

export async function generateCoolcatchBotApiKeyApi(): Promise<{
  apiKey: string;
  generatedAt: string;
}> {
  requireLiveApi("Coolcatch bot generate key");
  return apiRequest<{ apiKey: string; generatedAt: string }>(
    "/api/settings/integrations/coolcatch-bot/generate-key",
    { method: "POST" }
  );
}

export async function testCoolcatchBotConnectionApi(): Promise<CoolcatchTestResult> {
  requireLiveApi("Coolcatch bot test connection");
  return apiRequest<CoolcatchTestResult>(
    "/api/settings/integrations/coolcatch-bot/test-connection",
    { method: "POST" }
  );
}

export function getCoolcatchApiBaseFromFrontend(): string {
  return getApiBase() ?? "";
}
