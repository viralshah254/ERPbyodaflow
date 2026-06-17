import { apiRequest, getApiBase, requireLiveApi } from "./client";

export type MpesaTransactionType = "PAYBILL" | "TILL";
export type MpesaDarajaEnv = "sandbox" | "production";

export type OutletMpesaSettings = {
  outletOrgId?: string;
  enabled: boolean;
  shortCode: string | null;
  transactionType: MpesaTransactionType;
  darajaEnv: MpesaDarajaEnv;
  label: string | null;
  consumerKeyConfigured: boolean;
  consumerSecretConfigured: boolean;
  passkeyConfigured: boolean;
  /** True when all three Daraja secrets are stored (encrypted) for this outlet. */
  credentialsOnFile: boolean;
  encryptionConfigured: boolean;
  updatedAt: string | null;
  stkCallbackUrl: string | null;
  c2bConfirmationUrl: string | null;
};

export type UpdateOutletMpesaSettingsPayload = {
  enabled?: boolean;
  shortCode?: string;
  transactionType?: MpesaTransactionType;
  darajaEnv?: MpesaDarajaEnv;
  label?: string | null;
  consumerKey?: string | null;
  consumerSecret?: string | null;
  passkey?: string | null;
};

function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

function asEnv(v: unknown): MpesaDarajaEnv {
  return String(v ?? "").trim().toLowerCase() === "production" ? "production" : "sandbox";
}

function asTxn(v: unknown): MpesaTransactionType {
  return String(v ?? "").trim().toUpperCase() === "TILL" ? "TILL" : "PAYBILL";
}

/** Normalize API payload — handles older backends and explicit credentialsOnFile flag. */
export function normalizeOutletMpesaSettings(raw: Record<string, unknown>): OutletMpesaSettings {
  const consumerKeyConfigured = asBool(raw.consumerKeyConfigured);
  const consumerSecretConfigured = asBool(raw.consumerSecretConfigured);
  const passkeyConfigured = asBool(raw.passkeyConfigured);
  const credentialsOnFile =
    asBool(raw.credentialsOnFile) ||
    (consumerKeyConfigured && consumerSecretConfigured && passkeyConfigured);

  return {
    outletOrgId: typeof raw.outletOrgId === "string" ? raw.outletOrgId : undefined,
    enabled: asBool(raw.enabled),
    shortCode: typeof raw.shortCode === "string" && raw.shortCode.trim() ? raw.shortCode.trim() : null,
    transactionType: asTxn(raw.transactionType),
    darajaEnv: asEnv(raw.darajaEnv),
    label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : null,
    consumerKeyConfigured,
    consumerSecretConfigured,
    passkeyConfigured,
    credentialsOnFile,
    encryptionConfigured: asBool(raw.encryptionConfigured),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    stkCallbackUrl: typeof raw.stkCallbackUrl === "string" ? raw.stkCallbackUrl : null,
    c2bConfirmationUrl: typeof raw.c2bConfirmationUrl === "string" ? raw.c2bConfirmationUrl : null,
  };
}

export async function fetchOutletMpesaSettings(outletRef: string): Promise<OutletMpesaSettings> {
  requireLiveApi("Outlet M-Pesa settings");
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/franchise/outlets/${encodeURIComponent(outletRef)}/mpesa-settings`
  );
  return normalizeOutletMpesaSettings(raw);
}

export async function updateOutletMpesaSettings(
  outletRef: string,
  patch: UpdateOutletMpesaSettingsPayload
): Promise<OutletMpesaSettings> {
  requireLiveApi("Outlet M-Pesa settings");
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/franchise/outlets/${encodeURIComponent(outletRef)}/mpesa-settings`,
    { method: "PATCH", body: patch }
  );
  return normalizeOutletMpesaSettings(raw);
}

export async function clearOutletMpesaSettings(outletRef: string): Promise<OutletMpesaSettings> {
  requireLiveApi("Outlet M-Pesa settings");
  const raw = await apiRequest<Record<string, unknown>>(
    `/api/franchise/outlets/${encodeURIComponent(outletRef)}/mpesa-settings`,
    { method: "DELETE" }
  );
  return normalizeOutletMpesaSettings(raw);
}

export function mpesaSettingsConfigured(settings: OutletMpesaSettings): boolean {
  return settings.enabled || settings.credentialsOnFile || Boolean(settings.shortCode?.trim());
}

export function mpesaSettingsReady(settings: OutletMpesaSettings): boolean {
  return settings.enabled && Boolean(settings.shortCode?.trim()) && settings.credentialsOnFile;
}

const MPESA_STK_CALLBACK_PATH = "/api/payments/mpesa/stk-callback";
const MPESA_C2B_CONFIRMATION_PATH = "/api/payments/mpesa/c2b/confirmation";

/** Fallback when the API response omits callback URLs (uses NEXT_PUBLIC_API_URL). */
export function getMpesaStkCallbackUrlFromFrontend(): string {
  const base = getApiBase();
  return base ? `${base}${MPESA_STK_CALLBACK_PATH}` : MPESA_STK_CALLBACK_PATH;
}

export function getMpesaC2bConfirmationUrlFromFrontend(): string {
  const base = getApiBase();
  return base ? `${base}${MPESA_C2B_CONFIRMATION_PATH}` : MPESA_C2B_CONFIRMATION_PATH;
}

export function resolveOutletMpesaCallbackUrls(settings: OutletMpesaSettings): {
  stkCallbackUrl: string;
  c2bConfirmationUrl: string;
} {
  return {
    stkCallbackUrl: settings.stkCallbackUrl ?? getMpesaStkCallbackUrlFromFrontend(),
    c2bConfirmationUrl: settings.c2bConfirmationUrl ?? getMpesaC2bConfirmationUrlFromFrontend(),
  };
}