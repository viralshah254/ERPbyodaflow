"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveLockPassword, verifyLockPassword } from "@/lib/api/lock-password";
import { signOutOfErp } from "@/lib/auth/sign-out-erp";
import {
  CHANGE_LOCK_PASSWORD_EVENT,
  DEFAULT_LOCK_IDLE_MINUTES,
  formatLockDuration,
  idleLockMessage,
  isIdle,
  isScreenLocked,
  lockIdleMs,
  lockedStorageKey,
  normalizeLockIdleMinutes,
  parseLockIdleParts,
  readLastActivity,
  splitLockIdle,
  setScreenLocked,
  touchActivity,
  writeLastActivity,
} from "@/lib/auth/screen-lock";
import { useAuthStore } from "@/stores/auth-store";

const MIN_LOCK_PASSWORD_LENGTH = 4;
const CHECK_MS = 15_000;
const LOCK_IDLE_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "20 min", minutes: 20 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "1 hr 30 min", minutes: 90 },
  { label: "2 hr", minutes: 120 },
] as const;

function idleFields(totalMinutes: unknown): { hours: string; minutes: string } {
  const parts = splitLockIdle(totalMinutes);
  return { hours: String(parts.hours), minutes: String(parts.minutes) };
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function ScreenLockGate() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.userId;
  const needsSetup = Boolean(user) && user?.lockPasswordSet !== true;
  const savedIdleMinutes = normalizeLockIdleMinutes(user?.lockIdleMinutes);
  const idleMs = lockIdleMs(savedIdleMinutes);
  const [locked, setLocked] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [idleHours, setIdleHours] = useState(idleFields(DEFAULT_LOCK_IDLE_MINUTES).hours);
  const [idleMins, setIdleMins] = useState(idleFields(DEFAULT_LOCK_IDLE_MINUTES).minutes);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const lockedRef = useRef(false);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    setPassword("");
    setConfirm("");
    const fields = idleFields(useAuthStore.getState().user?.lockIdleMinutes);
    setIdleHours(fields.hours);
    setIdleMins(fields.minutes);
    setShowPassword(false);
    setShowConfirm(false);
    setError(null);
  }, [needsSetup, locked, changeOpen, userId]);

  useEffect(() => {
    if (!userId || needsSetup) {
      setLocked(false);
      return;
    }

    const lockNow = () => {
      lockedRef.current = true;
      setScreenLocked(userId, true);
      setChangeOpen(false);
      setLocked(true);
    };

    if (isScreenLocked(userId)) {
      lockNow();
    } else if (!readLastActivity(userId)) {
      writeLastActivity(userId);
    }

    const tick = () => {
      if (isScreenLocked(userId)) {
        lockNow();
        return;
      }
      if (isIdle(userId, Date.now(), idleMs)) lockNow();
    };

    const onActivity = () => {
      if (lockedRef.current || isScreenLocked(userId)) return;
      touchActivity(userId, Date.now(), idleMs);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== lockedStorageKey(userId)) return;
      if (event.newValue === "1") lockNow();
      else {
        lockedRef.current = false;
        setLocked(false);
      }
    };

    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const name of events) {
      window.addEventListener(name, onActivity, { passive: true });
    }
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", tick);
    const checkMs = Math.min(CHECK_MS, Math.max(5_000, Math.floor(idleMs / 4)));
    const timer = window.setInterval(tick, checkMs);
    tick();

    return () => {
      for (const name of events) window.removeEventListener(name, onActivity);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", tick);
      window.clearInterval(timer);
    };
  }, [userId, needsSetup, idleMs]);

  useEffect(() => {
    const open = () => {
      if (!userId || needsSetup || lockedRef.current) return;
      setChangeOpen(true);
    };
    window.addEventListener(CHANGE_LOCK_PASSWORD_EVENT, open);
    return () => window.removeEventListener(CHANGE_LOCK_PASSWORD_EVENT, open);
  }, [userId, needsSetup]);

  const blocking = Boolean(user) && (needsSetup || locked || changeOpen);

  useEffect(() => {
    if (!blocking) return;
    const root = document.querySelector(".app-providers-root");
    if (!root) return;
    const touched: HTMLElement[] = [];
    for (const child of Array.from(root.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.hasAttribute("data-screen-lock")) continue;
      if (child.hasAttribute("inert")) continue;
      child.setAttribute("inert", "");
      touched.push(child);
    }
    return () => {
      for (const node of touched) node.removeAttribute("inert");
    };
  }, [blocking]);

  if (!user || (!needsSetup && !locked && !changeOpen)) return null;

  const unlock = async () => {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      await verifyLockPassword(password);
      writeLastActivity(userId);
      setScreenLocked(userId, false);
      lockedRef.current = false;
      setLocked(false);
      setPassword("");
    } catch (err) {
      setError(errorMessage(err, "Incorrect lock password"));
    } finally {
      setBusy(false);
    }
  };

  const parsedIdle = parseLockIdleParts(idleHours, idleMins);

  const saveNew = async () => {
    if ("error" in parsedIdle) {
      setError(parsedIdle.error);
      return;
    }
    const minutes = parsedIdle.minutes;
    const keepPassword = !needsSetup && password.length === 0 && confirm.length === 0;
    if (!keepPassword) {
      if (password.length < MIN_LOCK_PASSWORD_LENGTH) {
        setError(`Use at least ${MIN_LOCK_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await saveLockPassword({
        ...(keepPassword ? {} : { password }),
        idleMinutes: minutes,
      });
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.getState().setUser({
          ...current,
          lockPasswordSet: true,
          lockIdleMinutes: saved.lockIdleMinutes,
        });
        writeLastActivity(current.userId);
        setScreenLocked(current.userId, false);
      }
      lockedRef.current = false;
      setLocked(false);
      setChangeOpen(false);
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(errorMessage(err, "Could not save the lock password"));
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    setSigningOut(true);
    void signOutOfErp();
  };

  const title = needsSetup
    ? "Set a lock password"
    : locked
      ? "ERP locked"
      : "Lock screen";
  const settingPassword = needsSetup || changeOpen;
  const description = needsSetup
    ? "This password unlocks the ERP after it locks. It is separate from your sign-in password. Use at least 4 characters, and choose how long to wait before the screen locks."
    : locked
      ? idleLockMessage(savedIdleMinutes)
      : "Choose a new lock password, or leave both password fields blank to keep the current one. Set how long to wait before the screen locks. Your sign-in password stays the same.";

  return (
    <div
      data-screen-lock
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
      role="presentation"
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="screen-lock-title"
        className="w-full max-w-md shadow-lg"
      >
        <CardHeader>
          <CardTitle id="screen-lock-title">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (locked && !needsSetup) void unlock();
              else void saveNew();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="screen-lock-password">
                {settingPassword ? "Lock password" : "Password"}
              </Label>
              <div className="relative">
                <Input
                  id="screen-lock-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={settingPassword ? "new-password" : "current-password"}
                  autoFocus
                  className="pr-10"
                  minLength={settingPassword && password.length > 0 ? MIN_LOCK_PASSWORD_LENGTH : undefined}
                  required={needsSetup}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy || signingOut}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={busy || signingOut}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <Icons.EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Icons.Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            {!locked || needsSetup ? (
              <div className="space-y-2">
                <Label htmlFor="screen-lock-confirm">Confirm lock password</Label>
                <div className="relative">
                  <Input
                    id="screen-lock-confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    minLength={confirm.length > 0 ? MIN_LOCK_PASSWORD_LENGTH : undefined}
                    required={needsSetup}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    disabled={busy || signingOut}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    aria-pressed={showConfirm}
                    disabled={busy || signingOut}
                    onClick={() => setShowConfirm((visible) => !visible)}
                  >
                    {showConfirm ? (
                      <Icons.EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Icons.Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
            {settingPassword ? (
              <fieldset className="space-y-2" disabled={busy || signingOut}>
                <legend className="text-sm font-medium">Lock after</legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {LOCK_IDLE_PRESETS.map((preset) => {
                    const selected =
                      "minutes" in parsedIdle && parsedIdle.minutes === preset.minutes;
                    return (
                      <Button
                        key={preset.minutes}
                        type="button"
                        size="sm"
                        variant={selected ? "secondary" : "outline"}
                        className="h-8 rounded-full px-2 text-xs"
                        aria-pressed={selected}
                        onClick={() => {
                          const fields = idleFields(preset.minutes);
                          setIdleHours(fields.hours);
                          setIdleMins(fields.minutes);
                          setError(null);
                        }}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor="screen-lock-hours" className="sr-only">
                    Hours
                  </Label>
                  <Input
                    id="screen-lock-hours"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={24}
                    step={1}
                    required
                    aria-label="Hours"
                    className="w-20"
                    value={idleHours}
                    onChange={(event) => {
                      const next = event.target.value;
                      setIdleHours(next);
                      if (Number(next) >= 24) setIdleMins("0");
                    }}
                  />
                  <span className="text-sm text-muted-foreground">hr</span>
                  <Label htmlFor="screen-lock-minutes" className="sr-only">
                    Minutes
                  </Label>
                  <Input
                    id="screen-lock-minutes"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={59}
                    step={1}
                    required
                    aria-label="Minutes"
                    className="w-20"
                    value={idleMins}
                    disabled={Number(idleHours) >= 24}
                    onChange={(event) => setIdleMins(event.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {"minutes" in parsedIdle
                    ? `Locks after ${formatLockDuration(parsedIdle.minutes)} of inactivity.`
                    : "For example, 1 hr and 30 min, or 45 min."}
                </p>
              </fieldset>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="flex-1" disabled={busy || signingOut}>
                {busy ? "Please wait…" : locked && !needsSetup ? "Unlock" : "Save"}
              </Button>
              {changeOpen && !needsSetup && !locked ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => setChangeOpen(false)}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={signingOut}
                  onClick={signOut}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
