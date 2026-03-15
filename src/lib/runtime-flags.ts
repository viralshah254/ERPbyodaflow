const TRUE_VALUES = new Set(["1", "true"]);
export type RuntimeMode = "live" | "dev";

function isTrue(value: string | undefined): boolean {
  return value != null && TRUE_VALUES.has(value.toLowerCase());
}

export function isDevAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    getRuntimeMode() !== "live" &&
    isTrue(process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH)
  );
}

export function isMockAuthEnabled(): boolean {
  return false;
}

export function isDevPagesEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && isTrue(process.env.NEXT_PUBLIC_ENABLE_DEV_PAGES);
}

function normalizeRuntimeMode(value: string | undefined): RuntimeMode {
  if (value === "dev") return value;
  return "live";
}

export function getRuntimeMode(): RuntimeMode {
  return normalizeRuntimeMode(process.env.NEXT_PUBLIC_RUNTIME_MODE);
}

export function canUseDevHeaders(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const localHost = host === "localhost" || host === "127.0.0.1";
  return localHost && getRuntimeMode() === "dev" && isDevAuthEnabled();
}
