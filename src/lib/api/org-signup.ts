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

export type OdaflowHandoff = {
  orgName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  trialActive: boolean;
  linkedToOdaflow: true;
};

/**
 * Resolves a signup link that came from OdaFlow SFA. The token is opaque here —
 * the API verifies it server-side and returns the company it belongs to.
 */
export async function resolveOdaflowHandoffApi(token: string): Promise<OdaflowHandoff> {
  const base = getApiBase();
  if (!base) throw new Error("API is not configured. Set NEXT_PUBLIC_API_URL.");
  const res = await fetch(
    `${base}/api/public/org-signup/handoff?token=${encodeURIComponent(token)}`,
    { headers: { Accept: "application/json" } },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Could not verify this link (${res.status})`);
  }
  return data as OdaflowHandoff;
}

export type HandoffSignupResult = {
  orgId: string;
  tenantId: string;
  manufacturerId: string;
  linked: boolean;
  linkError?: string;
};

/** Provisions immediately for an existing OdaFlow customer. */
export async function submitOdaflowHandoffSignupApi(
  payload: Omit<OrgSignupPayload, "orgName" | "plan"> & { token: string },
): Promise<HandoffSignupResult> {
  const base = getApiBase();
  if (!base) throw new Error("API is not configured. Set NEXT_PUBLIC_API_URL.");
  const res = await fetch(`${base}/api/public/org-signup/handoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as HandoffSignupResult;
}
