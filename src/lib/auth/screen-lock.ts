export const DEFAULT_LOCK_IDLE_MINUTES = 20;
export const MIN_LOCK_IDLE_MINUTES = 1;
export const MAX_LOCK_IDLE_MINUTES = 24 * 60;
const ACTIVITY_THROTTLE_MS = 30 * 1000;

export function normalizeLockIdleMinutes(value: unknown): number {
  const minutes = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(minutes)) return DEFAULT_LOCK_IDLE_MINUTES;
  if (minutes < MIN_LOCK_IDLE_MINUTES || minutes > MAX_LOCK_IDLE_MINUTES) {
    return DEFAULT_LOCK_IDLE_MINUTES;
  }
  return minutes;
}

export function lockIdleMs(minutes: unknown): number {
  return normalizeLockIdleMinutes(minutes) * 60 * 1000;
}

export function splitLockIdle(totalMinutes: unknown): { hours: number; minutes: number } {
  const total = normalizeLockIdleMinutes(totalMinutes);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** “1 hour 30 minutes”, “45 minutes”, “24 hours”. */
export function formatLockDuration(totalMinutes: unknown): string {
  const total = normalizeLockIdleMinutes(totalMinutes);
  if (total < 60) return total === 1 ? "1 minute" : `${total} minutes`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  if (minutes === 0) return hourLabel;
  const minuteLabel = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `${hourLabel} ${minuteLabel}`;
}

export function parseLockIdleParts(
  hoursRaw: string,
  minutesRaw: string
): { minutes: number } | { error: string } {
  const hoursText = hoursRaw.trim();
  const minutesText = minutesRaw.trim();
  if (!hoursText || !minutesText) {
    return { error: "Enter hours and minutes. The shortest wait is 1 minute, and the longest is 24 hours." };
  }
  if (!/^\d+$/.test(hoursText) || !/^\d+$/.test(minutesText)) {
    return { error: "Use whole hours and minutes." };
  }
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (hours > 24 || minutes > 59) {
    return { error: "Use up to 24 hours, and 0 to 59 minutes." };
  }
  const total = hours * 60 + minutes;
  if (total < MIN_LOCK_IDLE_MINUTES) return { error: "Use at least 1 minute." };
  if (total > MAX_LOCK_IDLE_MINUTES) return { error: "The longest wait is 24 hours." };
  return { minutes: total };
}

/** How often activity is written, short enough that a 1-minute lock stays accurate. */
export function activityThrottleMs(idleMs: number): number {
  return Math.min(ACTIVITY_THROTTLE_MS, Math.max(5_000, Math.floor(idleMs / 6)));
}

export function idleLockMessage(minutes: unknown): string {
  return `You were inactive for ${formatLockDuration(minutes)}. Enter your lock password to continue.`;
}

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

export function touchActivity(userId: string, now = Date.now(), idleMs = lockIdleMs(DEFAULT_LOCK_IDLE_MINUTES)): void {
  const last = readLastActivity(userId);
  if (last && now - last < activityThrottleMs(idleMs)) return;
  writeLastActivity(userId, now);
}

export function isIdle(userId: string, now = Date.now(), idleMs = lockIdleMs(DEFAULT_LOCK_IDLE_MINUTES)): boolean {
  const last = readLastActivity(userId);
  if (!last) return false;
  return now - last >= idleMs;
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
