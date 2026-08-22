import { setRememberMeUntil, signInWithCustomTokenAndGetIdToken } from "@/lib/firebase";
import { setApiAuth, setApiBaseOverride } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { erpApiCandidates, odaflowApiCandidates } from "@/lib/auth/odaflow-hub";

type ExchangePayload = {
  erpAssertion?: string;
  firebaseIdToken?: string;
};

const inFlight = new Map<string, Promise<string>>();

async function exchangeOn(base: string, code: string): Promise<ExchangePayload> {
  const exchangeRes = await fetch(`${base}/api/auth/sso/exchange`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, client: "erp" }),
    signal: AbortSignal.timeout(8000),
  });
  const exchangeJson = (await exchangeRes.json()) as {
    data?: ExchangePayload;
    error?: string;
    message?: string;
  };
  if (!exchangeRes.ok) {
    throw new Error(exchangeJson.message || exchangeJson.error || "SSO exchange failed");
  }
  return exchangeJson.data || {};
}

async function exchangeCode(code: string): Promise<ExchangePayload> {
  const bases = odaflowApiCandidates();
  let lastError: Error | null = null;
  for (const base of bases) {
    try {
      return await exchangeOn(base, code);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("SSO exchange failed");
    }
  }
  throw lastError || new Error("SSO exchange failed");
}

async function consumeAssertion(assertion: string): Promise<string> {
  let lastError: Error | null = null;
  for (const base of erpApiCandidates()) {
    try {
      const consumeRes = await fetch(`${base}/api/auth/odaflow-sso/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assertion }),
        signal: AbortSignal.timeout(8000),
      });
      const consumeJson = (await consumeRes.json()) as {
        customToken?: string;
        error?: string;
        message?: string;
        code?: string;
      };
      if (consumeRes.ok && consumeJson.customToken) {
        setApiBaseOverride(base);
        return signInWithCustomTokenAndGetIdToken(consumeJson.customToken, true);
      }
      lastError = new Error(
        consumeJson.error ||
          consumeJson.message ||
          (consumeJson.code ? `SSO consume failed (${consumeJson.code})` : "SSO consume failed")
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("SSO consume failed");
    }
  }
  throw lastError || new Error("Could not open an ERP session from Odaflow.");
}

async function sessionOn(base: string, token: string): Promise<string> {
  setApiBaseOverride(base);
  setRememberMeUntil();
  setApiAuth({ bearerToken: token });
  const session = await fetchRuntimeSession();
  const { setSession } = useAuthStore.getState();
  const { hydrateFromBackend } = useOrgContextStore.getState();
  setSession({
    user: session.user,
    org: session.org,
    tenant: session.tenant,
    currentBranch: session.currentBranch,
    branches: session.branches,
    permissions: session.permissions,
    isPlatformOperator: session.isPlatformOperator,
  });
  hydrateFromBackend({
    orgType: session.org.orgType,
    templateId: session.orgContext.templateId,
    industryCategory: session.orgContext.industryCategory,
    enabledModules: session.orgContext.enabledModules,
    featureFlags: session.orgContext.featureFlags,
    terminology: session.orgContext.terminology,
    defaultNav: session.orgContext.defaultNav,
    orgRole: session.orgContext.orgRole,
    parentOrgId: session.orgContext.parentOrgId,
    franchiseNetworkId: session.orgContext.franchiseNetworkId,
    franchiseCode: session.orgContext.franchiseCode,
    franchiseTerritory: session.orgContext.franchiseTerritory,
    franchiseStoreFormat: session.orgContext.franchiseStoreFormat,
    franchiseManagerName: session.orgContext.franchiseManagerName,
    franchisePersona: session.orgContext.franchisePersona,
  });
  return session.isPlatformOperator ? "/platform" : "/dashboard";
}

async function applyErpSession(token: string): Promise<string> {
  let lastError: Error | null = null;
  for (const base of erpApiCandidates()) {
    try {
      return await sessionOn(base, token);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Could not load ERP session");
    }
  }
  throw new Error(
    lastError?.message === "Failed to fetch"
      ? "ERP API is not reachable from this browser. Start the local ERP backend on port 4000, or point NEXT_PUBLIC_API_URL at https://erp-api.odaflow.com."
      : lastError?.message || "Could not open an ERP session."
  );
}

async function completeOnce(code: string): Promise<string> {
  const exchanged = await exchangeCode(code);
  let token = exchanged.firebaseIdToken || "";
  if (exchanged.erpAssertion) {
    const consumed = await consumeAssertion(exchanged.erpAssertion);
    if (consumed) token = consumed;
  }
  if (!token) {
    throw new Error("Could not open an ERP session from Odaflow.");
  }
  const dest = await applyErpSession(token);
  void import("@/lib/auth/attach-sfa-from-erp").then(({ attachSfaFromErp }) =>
    attachSfaFromErp().catch(() => undefined)
  );
  return dest;
}

export async function completeOdaflowHandoff(code: string): Promise<string> {
  const existing = inFlight.get(code);
  if (existing) return existing;
  const pending = completeOnce(code).finally(() => {
    window.setTimeout(() => inFlight.delete(code), 30_000);
  });
  inFlight.set(code, pending);
  return pending;
}
