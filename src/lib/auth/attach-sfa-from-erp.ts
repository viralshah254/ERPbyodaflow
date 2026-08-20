import { getApiBearerToken } from "@/lib/api/client";
import { getIdToken } from "@/lib/firebase";
import { odaflowApiCandidates } from "@/lib/auth/odaflow-hub";

export type SfaAttachResult = {
  attached: boolean;
  code?: string;
  redirectUrl?: string;
  message?: string;
};

export async function erpSessionToken(): Promise<string> {
  return getApiBearerToken() || (await getIdToken()) || "";
}

export async function attachSfaFromErp(options?: {
  next?: string;
  returnTo?: string;
}): Promise<SfaAttachResult> {
  const firebaseIdToken = await erpSessionToken();
  if (!firebaseIdToken) {
    return { attached: false, message: "No ERP session token." };
  }

  let last: SfaAttachResult = { attached: false, message: "Could not reach Odaflow." };
  for (const base of odaflowApiCandidates()) {
    try {
      const res = await fetch(`${base}/api/auth/sso/attach-from-erp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseIdToken,
          next: options?.next || "/",
          returnTo: options?.returnTo,
        }),
        signal: AbortSignal.timeout(8000),
      });
      const json = (await res.json()) as { data?: SfaAttachResult; message?: string };
      if (res.ok && json.data) {
        last = json.data;
        if (json.data.attached && json.data.redirectUrl) return json.data;
      }
    } catch {
      // try the next SFA API
    }
  }
  return last;
}
