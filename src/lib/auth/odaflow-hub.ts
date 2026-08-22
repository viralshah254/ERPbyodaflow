function isLocalHost(hostname?: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** OdaWeb hub. A local ERP page must stay on local OdaWeb. */
export function odaflowHubWebUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ODAFLOW_WEB_URL?.trim();
  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    if (fromEnv && /localhost|127\.0\.0\.1/.test(fromEnv)) return trimSlash(fromEnv);
    return "http://localhost:5173";
  }
  return trimSlash(fromEnv || "https://www.odaflow.com");
}

function envApiUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ODAFLOW_API_URL ||
    process.env.NEXT_PUBLIC_SFA_API_URL ||
    ""
  ).trim();
}

/**
 * SFA APIs that may have minted the handoff code.
 * Production ERP must exchange against api.odaflow.com (odaflow.com mints there).
 * Local ERP can also try the local hub and dev.
 */
export function odaflowApiCandidates(
  hostname = typeof window !== "undefined" ? window.location.hostname : ""
): string[] {
  const fromEnv = envApiUrl();
  const local = "http://localhost:8080";
  const prod = "https://api.odaflow.com";
  const remote = "https://dev.odaflow.com";
  const urls: string[] = [];
  if (fromEnv) urls.push(trimSlash(fromEnv));
  if (isLocalHost(hostname)) {
    urls.push(local, remote);
  } else {
    urls.push(prod);
    if (!fromEnv) urls.push(remote);
  }
  return [...new Set(urls.filter(Boolean))];
}

/** SFA / odaflow-backend API used for SSO exchange. */
export function odaflowApiUrl(
  hostname = typeof window !== "undefined" ? window.location.hostname : ""
): string {
  return odaflowApiCandidates(hostname)[0] || "https://api.odaflow.com";
}

/** SFA web app. A local ERP page must stay on local OdaWeb. */
export function odaflowSfaWebUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ODAFLOW_WEB_URL?.trim();
  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    if (fromEnv && /localhost|127\.0\.0\.1/.test(fromEnv)) return trimSlash(fromEnv);
    return "http://localhost:5173";
  }
  return trimSlash(fromEnv || "https://www.odaflow.com");
}

/** ERP APIs that can accept the Firebase session from hub login. */
export function erpApiCandidates(): string[] {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const local = "http://localhost:4000";
  const live = "https://erp-api.odaflow.com";
  const onLocalPage = typeof window !== "undefined" && isLocalHost(window.location.hostname);
  const urls: string[] = [];
  // Hub email login authenticates against live ERP. Prefer it from a local page
  // so a stopped localhost:4000 cannot hold the handoff open.
  if (onLocalPage) urls.push(live);
  if (fromEnv) urls.push(fromEnv);
  if (onLocalPage) urls.push(local);
  else if (!fromEnv) urls.push(live);
  return [...new Set(urls.filter(Boolean))];
}
