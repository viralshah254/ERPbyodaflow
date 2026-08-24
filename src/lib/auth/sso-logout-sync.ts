const STORAGE_KEY = "odaflow_sso_logout_at";
const CHANNEL = "odaflow-sso-logout";
const COOKIE = "odaflow_logout_at";
const LOGIN_KEY = "odaflow_login_at";

function cookieDomainSuffix(): string {
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return "";
  if (host === "odaflow.com" || host.endsWith(".odaflow.com")) return "; Domain=.odaflow.com";
  return "";
}

export function markOdaflowLogin(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOGIN_KEY, String(Date.now()));
}

export function writeOdaflowLogoutCookie(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${COOKIE}=${Date.now()}; Path=/; SameSite=Lax; Max-Age=86400${cookieDomainSuffix()}`;
}

export function readOdaflowLogoutAt(): number {
  if (typeof window === "undefined") return 0;
  const match = document.cookie.match(/(?:^|; )odaflow_logout_at=(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function shouldDropLocalSession(): boolean {
  if (typeof window === "undefined") return false;
  const loginAt = Number(localStorage.getItem(LOGIN_KEY) || 0);
  const logoutAt = readOdaflowLogoutAt();
  return logoutAt > 0 && logoutAt > loginAt;
}

export function broadcastOdaflowLogout(): void {
  if (typeof window === "undefined") return;
  writeOdaflowLogoutCookie();
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore quota / private mode
  }
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ at: Date.now() });
    channel.close();
  } catch {
    // older browsers
  }
}

function siblingOrigins(): string[] {
  const host = window.location.hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  const origins = local
    ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174", "http://localhost:5175"]
    : [
        "https://www.odaflow.com",
        "https://odaflow.com",
        "https://erp.odaflow.com",
        "https://crm.odaflow.com",
        "https://people.odaflow.com",
      ];
  return origins.filter((origin) => origin !== window.location.origin);
}

export function pingSiblingSignOut(): void {
  writeOdaflowLogoutCookie();
  for (const origin of siblingOrigins()) {
    const iframe = document.createElement("iframe");
    iframe.src = `${origin}/auth/sign-out?embed=1`;
    iframe.setAttribute("style", "position:absolute;width:0;height:0;border:0;visibility:hidden");
    document.body.appendChild(iframe);
  }
}

export function onOdaflowLogout(handler: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) handler();
  };
  window.addEventListener("storage", onStorage);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => handler();
  } catch {
    channel = null;
  }
  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
