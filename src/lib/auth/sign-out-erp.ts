import { setApiAuth } from "@/lib/api/client";
import { clearErpScreenLock } from "@/lib/auth/screen-lock";
import { odaflowHubLoggedOutUrl } from "@/lib/auth/odaflow-hub";
import { pingSiblingSignOut } from "@/lib/auth/sso-logout-sync";
import { signOut as firebaseSignOut } from "@/lib/firebase";
import { unregisterWebPushToken } from "@/lib/push-notifications";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";

export async function signOutOfErp(): Promise<void> {
  const userId = useAuthStore.getState().user?.userId;
  if (userId) clearErpScreenLock(userId);
  try {
    await unregisterWebPushToken();
  } catch {
    // best-effort before token is cleared
  }
  pingSiblingSignOut();
  setApiAuth({ bearerToken: undefined });
  useAuthStore.getState().logout();
  useOrgContextStore.getState().reset();
  try {
    await firebaseSignOut();
  } catch {
    // ignore if Firebase is unavailable or already signed out
  }
  window.location.assign(odaflowHubLoggedOutUrl("erp"));
}
