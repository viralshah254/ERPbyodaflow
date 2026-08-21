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

const PROD_WEB_HOSTS = new Set([
  "www.odaflow.com",
  "odaflow.com",
  "people.odaflow.com",
  "crm.odaflow.com",
  "erp.odaflow.com",
]);

/**
 * Production ERP/SFA webs talk to api.odaflow.com.
 * Local npm run dev tries localhost, then dev.odaflow.com.
 */
export function odaflowApiCandidates(): string[] {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  if (PROD_WEB_HOSTS.has(host)) return ["https://api.odaflow.com"];
  if (isLocalHost(host)) return ["http://localhost:8080", "https://dev.odaflow.com"];
  const fromEnv = envApiUrl();
  if (fromEnv && !/localhost|127\.0\.0\.1/.test(fromEnv)) return [trimSlash(fromEnv)];
  return ["https://api.odaflow.com"];
}

/** SFA / odaflow-backend API used for SSO exchange. */
export function odaflowApiUrl(): string {
  return odaflowApiCandidates()[0] || "https://api.odaflow.com";
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
