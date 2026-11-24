import { apiRequest } from "./client";

export type LockSettings = {
  lockPasswordSet: boolean;
  lockIdleMinutes: number;
};

export function saveLockPassword(input: {
  password?: string;
  idleMinutes: number;
}): Promise<LockSettings> {
  return apiRequest("/api/me/lock-password", {
    method: "PUT",
    body: input,
  });
}

export function verifyLockPassword(password: string): Promise<{ ok: boolean }> {
  return apiRequest("/api/me/lock-password/verify", {
    method: "POST",
    body: { password },
  });
}
