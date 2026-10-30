import { apiRequest } from "./client";

export function saveLockPassword(password: string): Promise<{ lockPasswordSet: boolean }> {
  return apiRequest("/api/me/lock-password", {
    method: "PUT",
    body: { password },
  });
}

export function verifyLockPassword(password: string): Promise<{ ok: boolean }> {
  return apiRequest("/api/me/lock-password/verify", {
    method: "POST",
    body: { password },
  });
}
