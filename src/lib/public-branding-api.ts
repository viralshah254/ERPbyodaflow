import { getApiBase } from "@/lib/api/client";

export type PublicBrandingPayload = {
  tenantId: string;
  tenantName: string;
  slug: string | null;
  brandingOrgId: string;
  brandingOrgName: string;
  hasLogo: boolean;
  splashBackground?: string;
  logoPath: string;
};

export async function fetchPublicBrandingBySlug(slug: string): Promise<PublicBrandingPayload | null> {
  const base = getApiBase();
  const trimmed = slug.trim();
  if (!base || !trimmed) return null;
  try {
    const res = await fetch(`${base}/public/branding/by-slug/${encodeURIComponent(trimmed)}`, {
      method: "GET",
      credentials: "omit",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicBrandingPayload;
  } catch {
    return null;
  }
}

export function brandingLogoAbsoluteUrl(brandingOrgId: string): string {
  const base = getApiBase().replace(/\/$/, "");
  return `${base}/public/branding/logo/${encodeURIComponent(brandingOrgId)}`;
}
