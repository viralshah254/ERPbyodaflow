import { getApiBase } from "./client";

export type OrgSignupPayload = {
  industryCategory?: "FMCG" | "SEAFOOD" | "OTHER";
  orgType: "MANUFACTURER" | "DISTRIBUTOR" | "RETAIL";
  templateId: string;
  templateName?: string;
  orgName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  currency: string;
  timeZone: string;
  plan?: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  message?: string;
};

export type OrgSignupRequestRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  industryCategory?: "FMCG" | "SEAFOOD" | "OTHER";
  orgType: string;
  templateId: string;
  templateName?: string;
  orgName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  currency: string;
  timeZone: string;
  plan: string;
  message?: string;
  createdAt: string;
};

export async function submitOrgSignupApi(payload: OrgSignupPayload): Promise<OrgSignupRequestRow> {
  const base = getApiBase();
  if (!base) {
    throw new Error("API is not configured. Set NEXT_PUBLIC_API_URL.");
  }
  const res = await fetch(`${base}/api/public/org-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return (data as { request: OrgSignupRequestRow }).request;
}
