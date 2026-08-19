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

/** SFA / odaflow-backend API used for SSO exchange. */
export function odaflowApiUrl(): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_ODAFLOW_API_URL ||
    process.env.NEXT_PUBLIC_SFA_API_URL ||
    ""
  ).trim();
  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    if (fromEnv && /localhost|127\.0\.0\.1/.test(fromEnv)) return trimSlash(fromEnv);
    return "http://localhost:8080";
  }
  return trimSlash(fromEnv || "https://dev.odaflow.com");
}
