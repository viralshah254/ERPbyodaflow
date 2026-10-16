import { setApiAuth } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import { completeOdaflowHandoff } from "@/lib/auth/complete-odaflow-handoff";
import { odaflowApiUrl, safeInAppPath } from "@/lib/auth/odaflow-hub";
import { getCurrentFirebaseIdTokenForApi } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";

export type HubRestoreResult = "restored" | "signed-out" | "unavailable";

let pending: Promise<HubRestoreResult> | null = null;

function currentNextPath(): string {
  if (typeof window === "undefined") return "/dashboard";
  return safeInAppPath(`${window.location.pathname}${window.location.search}`) || "/dashboard";
}

/**
 * Rebuild the ERP login from the SFA cookie without leaving the page.
 * The cookie is shared across *.odaflow.com, so this stays inside the open tab.
 */
async function restoreOnce(): Promise<HubRestoreResult> {
  if (typeof window === "undefined") return "unavailable";
  const api = odaflowApiUrl();
  let sessionRes: Response;
  try {
    sessionRes = await fetch(`${api}/api/auth/sso/session`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    return "unavailable";
  }
  if (!sessionRes.ok) return "unavailable";
  const sessionJson = (await sessionRes.json().catch(() => null)) as {
    data?: { authenticated?: boolean };
  } | null;
  if (!sessionJson?.data?.authenticated) return "signed-out";

  let mintRes: Response;
  try {
    mintRes = await fetch(`${api}/api/auth/sso/mint`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client: "erp", next: currentNextPath() }),
    });
  } catch {
    return "unavailable";
  }
  const mintJson = (await mintRes.json().catch(() => null)) as {
    data?: { code?: string; allowed?: boolean };
  } | null;
  const code = mintJson?.data?.code?.trim();
  if (!mintRes.ok || !code || mintJson?.data?.allowed === false) return "unavailable";

  try {
    await completeOdaflowHandoff(code);
  } catch {
    return "unavailable";
  }
  return useAuthStore.getState().user ? "restored" : "unavailable";
}

export function restoreErpSessionFromHub(): Promise<HubRestoreResult> {
  if (!pending) {
    pending = restoreOnce().finally(() => {
      pending = null;
    });
  }
  return pending;
}

let reloading: Promise<boolean> | null = null;

/** Pull a fresh token and permission list into this tab. One shared call at a time. */
export function reloadErpPermissions(): Promise<boolean> {
  if (!reloading) {
    reloading = reloadPermissionsOnce().finally(() => {
      reloading = null;
    });
  }
  return reloading;
}

async function reloadPermissionsOnce(): Promise<boolean> {
  const token = await getCurrentFirebaseIdTokenForApi(true);
  if (!token) {
    const restored = await restoreErpSessionFromHub();
    return restored === "restored";
  }
  setApiAuth({ bearerToken: token });
  try {
    const session = await fetchRuntimeSession();
    useAuthStore.getState().setSession({
      user: session.user,
      org: session.org,
      tenant: session.tenant,
      currentBranch: session.currentBranch,
      branches: session.branches,
      permissions: session.permissions,
      isPlatformOperator: session.isPlatformOperator,
      collectionsHold: session.collectionsHold,
    });
    setApiAuth({ bearerToken: token, branchId: session.currentBranch?.branchId });
    return true;
  } catch {
    return false;
  }
}
