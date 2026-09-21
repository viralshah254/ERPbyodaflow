/**
 * Gaia chat client for the ERP dashboard.
 * Exchanges the logged-in ERP session for a Gaia JWT, then POSTs /chat.
 */

import { getCurrentFirebaseIdTokenForApi } from "@/lib/firebase";
import { canUseDevHeaders } from "@/lib/runtime-flags";

const DEFAULT_GAIA_API_BASE_URL = "https://gaia.odaflow.com";
const GAIA_BASE = (
  process.env.NEXT_PUBLIC_GAIA_API_BASE_URL?.trim() || DEFAULT_GAIA_API_BASE_URL
).replace(/\/$/, "");
const ENV_DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";
const ENV_BRANCH_ID = process.env.NEXT_PUBLIC_CURRENT_BRANCH_ID ?? "";

export function isGaiaConfigured(): boolean {
  return Boolean(GAIA_BASE);
}

type GaiaAuthResult = {
  access_token: string;
  expires_in_minutes: number;
  display_name?: string | null;
  email?: string | null;
  org_id?: string | null;
  role: string;
};

let cachedGaiaToken: string | null = null;
let cachedGaiaExpiry = 0;

async function erpAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const token = await getCurrentFirebaseIdTokenForApi();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (ENV_BRANCH_ID) {
    headers["X-Current-Branch-Id"] = ENV_BRANCH_ID;
  }
  if (canUseDevHeaders() && ENV_DEV_USER_ID) {
    headers["X-Dev-User-Id"] = ENV_DEV_USER_ID;
  }
  return headers;
}

export async function exchangeGaiaToken(force = false): Promise<string> {
  if (!GAIA_BASE) {
    throw new Error("Gaia is not configured (set NEXT_PUBLIC_GAIA_API_BASE_URL)");
  }
  const now = Date.now();
  if (!force && cachedGaiaToken && now < cachedGaiaExpiry - 60_000) {
    return cachedGaiaToken;
  }
  const headers = await erpAuthHeaders();
  if (!headers.Authorization && !headers["X-Dev-User-Id"]) {
    throw new Error("You are not signed in");
  }
  const res = await fetch(`${GAIA_BASE}/auth/erp`, {
    method: "POST",
    headers,
    body: "{}",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Gaia auth failed (${res.status})`);
  }
  const data = (await res.json()) as GaiaAuthResult;
  cachedGaiaToken = data.access_token;
  cachedGaiaExpiry = now + (data.expires_in_minutes || 60) * 60_000;
  return cachedGaiaToken;
}

export async function sendGaiaMessage(message: string): Promise<string> {
  if (!GAIA_BASE) {
    throw new Error("Gaia is not configured (set NEXT_PUBLIC_GAIA_API_BASE_URL)");
  }
  const gaiaToken = await exchangeGaiaToken();
  const erpHeaders = await erpAuthHeaders();
  const erpBearer = erpHeaders.Authorization?.replace(/^Bearer\s+/i, "");

  const post = async (token: string) =>
    fetch(`${GAIA_BASE}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(erpBearer ? { "X-OdaFlow-User-Auth": erpBearer } : {}),
      },
      body: JSON.stringify({ message }),
    });

  let res = await post(gaiaToken);
  if (res.status === 401) {
    const fresh = await exchangeGaiaToken(true);
    res = await post(fresh);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Gaia chat failed (${res.status})`);
  }
  const data = (await res.json()) as { reply?: string };
  return data.reply ?? "";
}

export async function resetGaiaChat(): Promise<void> {
  if (!GAIA_BASE) return;
  const gaiaToken = await exchangeGaiaToken();
  await fetch(`${GAIA_BASE}/chat/reset`, {
    method: "POST",
    headers: { Authorization: `Bearer ${gaiaToken}` },
  });
}

export function clearGaiaSessionCache(): void {
  cachedGaiaToken = null;
  cachedGaiaExpiry = 0;
}

export type GaiaImportExclude = { row: number; reason: string };

export async function reviewTallyImportWithGaia(
  candidates: Array<{ row: number; path: string; name: string; barcode?: string; size?: string; reviewReason?: string }>
): Promise<GaiaImportExclude[]> {
  if (candidates.length === 0) return [];
  const compact = candidates.slice(0, 80).map((c) => ({
    row: c.row,
    path: c.path,
    name: c.name,
    barcode: c.barcode ?? "",
    size: c.size ?? "",
    hint: c.reviewReason ?? "",
  }));
  const reply = await sendGaiaMessage(
    [
      "You are reviewing a Tally stock-group import for Top Food EA Ltd.",
      "Titles are Finished Goods, Packaging Material, Raw Material. Categories are brands/types like CANDY KENYA or CARTON.",
      "Suggest which rows should NOT become products (junk groups, rollups, samples, discontinued leftovers, group names without a SKU).",
      "Reply with JSON only: {\"exclude\":[{\"row\":123,\"reason\":\"one line\"}]}",
      "Candidates:",
      JSON.stringify(compact),
    ].join("\n")
  );
  const match = reply.match(/\{[\s\S]*\}/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]) as { exclude?: Array<{ row?: unknown; reason?: unknown }> };
    return (parsed.exclude ?? [])
      .map((item) => ({
        row: Number(item.row),
        reason: String(item.reason ?? "Gaia suggested skip").trim(),
      }))
      .filter((item) => Number.isFinite(item.row) && item.row > 0);
  } catch {
    return [];
  }
}
