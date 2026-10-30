const IDLE_MS = 20 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 30 * 1000;

export const CHANGE_LOCK_PASSWORD_EVENT = "erp-change-lock-password";

function activityKey(userId: string): string {
  return `erp-screen-lock:activity:${userId}`;
}

export function lockedStorageKey(userId: string): string {
  return `erp-screen-lock:locked:${userId}`;
}

export function isScreenLocked(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(lockedStorageKey(userId)) === "1";
}

export function setScreenLocked(userId: string, locked: boolean): void {
  if (typeof window === "undefined") return;
  const key = lockedStorageKey(userId);
  if (locked) localStorage.setItem(key, "1");
  else localStorage.removeItem(key);
}

export function readLastActivity(userId: string): number {
  if (typeof window === "undefined") return 0;
  const value = Number(localStorage.getItem(activityKey(userId)));
  return Number.isFinite(value) ? value : 0;
}

export function writeLastActivity(userId: string, at = Date.now()): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(activityKey(userId), String(at));
}

export function touchActivity(userId: string, now = Date.now()): void {
  const last = readLastActivity(userId);
  if (last && now - last < ACTIVITY_THROTTLE_MS) return;
  writeLastActivity(userId, now);
}

export function isIdle(userId: string, now = Date.now()): boolean {
  const last = readLastActivity(userId);
  if (!last) return false;
  return now - last >= IDLE_MS;
}

/** A new sign-in or sign-out starts unlocked, with the idle clock reset. */
export function clearErpScreenLock(userId: string): void {
  setScreenLocked(userId, false);
  writeLastActivity(userId);
}

export function requestChangeLockPassword(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_LOCK_PASSWORD_EVENT));
}
