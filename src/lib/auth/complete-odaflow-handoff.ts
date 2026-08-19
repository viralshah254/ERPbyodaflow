import { setRememberMeUntil, signInWithCustomTokenAndGetIdToken } from "@/lib/firebase";
import { setApiAuth } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { odaflowApiUrl } from "@/lib/auth/odaflow-hub";

const ERP_API = process.env.NEXT_PUBLIC_API_URL || "";

export async function completeOdaflowHandoff(code: string): Promise<string> {
  const exchangeRes = await fetch(`${odaflowApiUrl()}/api/auth/sso/exchange`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, client: "erp" }),
  });
  const exchangeJson = (await exchangeRes.json()) as {
    data?: { erpAssertion?: string; firebaseIdToken?: string };
    error?: string;
    message?: string;
  };
  if (!exchangeRes.ok) {
    throw new Error(exchangeJson.message || exchangeJson.error || "SSO exchange failed");
  }

  const assertion = exchangeJson?.data?.erpAssertion;
  let token = exchangeJson?.data?.firebaseIdToken || "";

  if (assertion && ERP_API) {
    try {
      const consumeRes = await fetch(`${ERP_API}/api/auth/odaflow-sso/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assertion }),
      });
      const consumeJson = (await consumeRes.json()) as {
        customToken?: string;
      };
      if (consumeRes.ok && consumeJson.customToken) {
        token = await signInWithCustomTokenAndGetIdToken(consumeJson.customToken, true);
      }
    } catch {
      // Consume route may not be deployed yet.
    }
  }

  if (!token) {
    throw new Error("Could not open an ERP session. Sign in with email on this page.");
  }

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
