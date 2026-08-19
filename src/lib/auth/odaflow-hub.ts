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
 * Local ERP often talks to a local hub while the code was issued on dev.odaflow.com.
 */
export function odaflowApiCandidates(): string[] {
  const fromEnv = envApiUrl();
  const local = "http://localhost:8080";
  const remote = "https://dev.odaflow.com";
  const urls: string[] = [];
  if (fromEnv) urls.push(trimSlash(fromEnv));
  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    urls.push(local, remote);
  } else if (!fromEnv) {
    urls.push(remote);
  }
  return [...new Set(urls.filter(Boolean))];
}

/** SFA / odaflow-backend API used for SSO exchange. */
export function odaflowApiUrl(): string {
  return odaflowApiCandidates()[0] || "https://dev.odaflow.com";
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
