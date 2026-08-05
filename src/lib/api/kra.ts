import { apiRequest } from "@/lib/api/client";

export type KraPinVerifyResult = {
  available: boolean;
  valid?: boolean;
  pin?: string;
  taxpayerName?: string;
  taxpayerType?: string;
  pinStatus?: string;
  message?: string;
  reason?: "not_configured" | "invalid_format" | "invalid_pin" | "service_error";
  fallbackUrl: string;
};

export async function verifyKraPinApi(pin: string): Promise<KraPinVerifyResult> {
  return apiRequest<KraPinVerifyResult>("/api/kra/verify-pin", {
    method: "POST",
    body: { pin },
  });
}

export const KRA_ITAX_PIN_CHECKER_URL = "https://itax.kra.go.ke/KRA-Portal/pinChecker.htm";
