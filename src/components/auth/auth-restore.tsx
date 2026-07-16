"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import {
  getFirebaseConfig,
  isFirebaseConfigured,
  isRememberMeExpired,
  signOut,
} from "@/lib/firebase";
import { isApiConfigured, setApiAuth } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";

const DEFAULT_TEMPLATE_BY_ORG_TYPE: Record<string, string> = {
  MANUFACTURER: "fmcg-manufacturer",
  DISTRIBUTOR: "fmcg-distributor",
  SHOP: "retail-multi-store",
};

/**
 * Restores session from Firebase when the app loads (e.g. user reopens the browser).
 * Runs once on mount so the header and any page can show "logged in" state.
 */
export function AuthRestore() {
  const finishHydration = useAuthStore((s) => s.finishHydration);
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  const applyTemplate = useOrgContextStore((s) => s.applyTemplate);

  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | null = null;

    const restore = async () => {
      if (!isApiConfigured() || !isFirebaseConfigured()) {
        finishHydration();
        return;
      }

      try {
        const { getAuth } = await import("firebase/auth");
        const { getApp, getApps, initializeApp } = await import("firebase/app");
        const config = getFirebaseConfig();
        const app = getApps().length === 0 ? initializeApp(config) : getApp();
        const auth = getAuth(app);

        let resolved = false;
        let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
        const done = () => {
          if (!resolved) {
            resolved = true;
            if (pendingTimeout) clearTimeout(pendingTimeout);
            pendingTimeout = null;
            finishHydration();
          }
        };

        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
          void (async () => {
            if (cancelled) return;
            if (pendingTimeout) {
              clearTimeout(pendingTimeout);
              pendingTimeout = null;
            }
            if (firebaseUser) {
              if (isRememberMeExpired()) {
                await signOut();
                if (!cancelled) logout();
                done();
                return;
              }
              try {
                const token = await firebaseUser.getIdToken();
                setApiAuth({ bearerToken: token });
                const session = await fetchRuntimeSession();
                if (cancelled) return;
                setSession({
                  user: session.user,
                  org: session.org,
                  tenant: session.tenant,
                  currentBranch: session.currentBranch,
                  branches: session.branches,
                  permissions: session.permissions,
                  isPlatformOperator: session.isPlatformOperator,
                });
                useOrgContextStore.getState().hydrateFromBackend({
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
                setApiAuth({
                  bearerToken: token,
                  branchId: session.currentBranch?.branchId,
                });
                // Only fall back to the org-type default if the backend didn't
                // already specify a template (e.g. "seafood-distributor").
                if (!session.orgContext.templateId) {
                  const tid = DEFAULT_TEMPLATE_BY_ORG_TYPE[session.org.orgType];
                  if (tid) applyTemplate(tid);
                }
              } catch {
                if (!cancelled) logout();
              }
              done();
              return;
            }
            // No user: give Firebase time to restore from persistence, then mark logged out
            pendingTimeout = setTimeout(() => {
              pendingTimeout = null;
              if (!cancelled && !resolved) done();
            }, 700);
          })().catch((err) => {
            console.warn("[AuthRestore] session restore failed:", err);
            if (!cancelled) logout();
            done();
          });
        });

        teardown = () => {
          unsubscribe();
          if (pendingTimeout) clearTimeout(pendingTimeout);
        };
        if (cancelled) teardown();
      } catch {
        finishHydration();
      }
    };

    void restore();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [finishHydration, setSession, logout, applyTemplate]);

  return null;
}
