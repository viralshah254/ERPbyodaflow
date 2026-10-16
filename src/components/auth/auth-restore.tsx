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
import { isApiConfigured, erpHandoffGraceActive, setApiAuth } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import { odaflowHubLoggedOutUrl, odaflowHubLoginUrl } from "@/lib/auth/odaflow-hub";
import { restoreErpSessionFromHub } from "@/lib/auth/restore-erp-session";
import { onOdaflowLogout, shouldDropLocalSession } from "@/lib/auth/sso-logout-sync";

const DEFAULT_TEMPLATE_BY_ORG_TYPE: Record<string, string> = {
  MANUFACTURER: "fmcg-manufacturer",
  DISTRIBUTOR: "fmcg-distributor",
  SHOP: "retail-multi-store",
};

/** A new tab often emits a signed-out flicker before IndexedDB restores the user. */
const SIGNED_OUT_GRACE_MS = 2000;

function currentErpReturnPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function leaveErpTab(realLogout: boolean) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/auth/") || path.startsWith("/login")) return;
  window.location.replace(
    realLogout
      ? odaflowHubLoggedOutUrl("erp")
      : odaflowHubLoginUrl("erp", currentErpReturnPath())
  );
}

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
        await auth.authStateReady();
        if (cancelled) return;

        let resolved = false;
        let signedOutTimer: ReturnType<typeof setTimeout> | null = null;
        let restoreTicket = 0;
        const clearSignedOutTimer = () => {
          if (signedOutTimer) {
            clearTimeout(signedOutTimer);
            signedOutTimer = null;
          }
        };
        const done = () => {
          if (!resolved) {
            resolved = true;
            clearSignedOutTimer();
            finishHydration();
          }
        };

        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
          void (async () => {
            if (cancelled) return;
            clearSignedOutTimer();
            if (firebaseUser) {
              const ticket = ++restoreTicket;
              if (shouldDropLocalSession() && !erpHandoffGraceActive()) {
                await signOut();
                if (!cancelled && shouldDropLocalSession() && !erpHandoffGraceActive()) {
                  setApiAuth({ bearerToken: undefined });
                  logout();
                  leaveErpTab(true);
                }
                done();
                return;
              }
              if (isRememberMeExpired()) {
                await signOut();
                if (!cancelled) logout();
                done();
                return;
              }
              try {
                const token = await firebaseUser.getIdToken();
                if (cancelled || ticket !== restoreTicket) return;
                setApiAuth({ bearerToken: token });
                const session = await fetchRuntimeSession();
                if (cancelled || ticket !== restoreTicket) return;
                setSession({
                  user: session.user,
                  org: session.org,
                  tenant: session.tenant,
                  currentBranch: session.currentBranch,
                  branches: session.branches,
                  permissions: session.permissions,
                  isPlatformOperator: session.isPlatformOperator,
                  collectionsHold: session.collectionsHold,
                });
                if (session.collectionsHold?.enabled && typeof window !== "undefined") {
                  const path = window.location.pathname;
                  if (!path.startsWith("/collections-hold") && !path.startsWith("/login") && !path.startsWith("/auth/")) {
                    window.location.replace("/collections-hold");
                  }
                }
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
                void import("@/lib/auth/attach-sfa-from-erp").then(({ attachSfaFromErp }) =>
                  attachSfaFromErp().catch(() => undefined)
                );
              } catch {
                if (!cancelled && ticket === restoreTicket && !erpHandoffGraceActive()) logout();
              }
              if (!cancelled && ticket === restoreTicket) done();
              return;
            }
            // A brand-new tab often hears "signed out" before the shared Firebase
            // session is read, and again while that read is still in flight.
            // Wait, then trust currentUser — don't bounce through sign-in on a flicker.
            signedOutTimer = setTimeout(() => {
              signedOutTimer = null;
              void (async () => {
                if (cancelled || auth.currentUser) return;
                const hadSession = Boolean(useAuthStore.getState().user);
                if (hadSession && erpHandoffGraceActive()) {
                  if (!resolved) done();
                  return;
                }
                if (hadSession && shouldDropLocalSession()) {
                  restoreTicket += 1;
                  setApiAuth({ bearerToken: undefined });
                  logout();
                  if (!resolved) done();
                  leaveErpTab(true);
                  return;
                }
                // Ask SFA for the shared cookie and rebuild this tab in place.
                const restored = await restoreErpSessionFromHub().catch(() => "unavailable" as const);
                if (cancelled || auth.currentUser) return;
                if (restored === "restored" && useAuthStore.getState().user) {
                  if (!resolved) done();
                  return;
                }
                restoreTicket += 1;
                setApiAuth({ bearerToken: undefined });
                logout();
                if (!resolved) done();
                leaveErpTab(false);
              })();
            }, SIGNED_OUT_GRACE_MS);
          })().catch((err) => {
            console.warn("[AuthRestore] session restore failed:", err);
            if (!cancelled && !erpHandoffGraceActive()) logout();
            done();
          });
        });

        // Keep in-memory Bearer aligned when Firebase rotates the ~1h ID token.
        const unsubIdToken = auth.onIdTokenChanged((firebaseUser) => {
          void (async () => {
            if (cancelled || !firebaseUser) return;
            try {
              const token = await firebaseUser.getIdToken();
              if (!cancelled) setApiAuth({ bearerToken: token });
            } catch {
              /* ignore — next API call will force-refresh or send to launchpad */
            }
          })();
        });

        const onVisible = () => {
          if (document.visibilityState !== "visible") return;
          const user = auth.currentUser;
          if (!user) return;
          void user.getIdToken(true).then((token) => {
            if (!cancelled) setApiAuth({ bearerToken: token });
          }).catch(() => undefined);
        };
        document.addEventListener("visibilitychange", onVisible);

        const stopLogoutSync = onOdaflowLogout(() => {
          if (cancelled) return;
          if (!useAuthStore.getState().user) return;
          setApiAuth({ bearerToken: undefined });
          logout();
          leaveErpTab(true);
        });

        teardown = () => {
          unsubscribe();
          unsubIdToken();
          document.removeEventListener("visibilitychange", onVisible);
          stopLogoutSync();
          clearSignedOutTimer();
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
