/**
 * API client for backend (erp_odaflow_backend).
 * When NEXT_PUBLIC_API_URL is set, requests are sent to the backend; otherwise stubs are used.
 *
 * Auth (see docs/COOL_CATCH_API_CONNECT.md):
 * - Production: Authorization: Bearer <firebase-id-token>
 * - Dev: X-Dev-User-Id or X-Dev-Firebase-Uid
 * - Optional: X-Current-Branch-Id for branch-scoped data
 */

const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";

export function getApiBase(): string {
  return API_BASE.replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return !!API_BASE;
}

export type ApiAuthOptions = {
  /** Firebase ID token (production). */
  bearerToken?: string;
  /** Dev only: load user by internal user id. */
  devUserId?: string;
  /** Dev only: load user by Firebase UID. */
  devFirebaseUid?: string;
  /** Optional branch context for branch-scoped data. */
  branchId?: string;
};

let authOptions: ApiAuthOptions = {};

/** Set auth options (e.g. from auth store after login). Call after Firebase auth or when using dev headers. */
export function setApiAuth(options: ApiAuthOptions): void {
  authOptions = options;
}

/** Get auth headers per COOL_CATCH_API_CONNECT.md. Skip Content-Type so FormData can set its own. */
function getAuthHeaders(includeJsonContentType = false): HeadersInit {
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (authOptions.bearerToken) {
    headers["Authorization"] = `Bearer ${authOptions.bearerToken}`;
  }
  if (authOptions.devUserId) {
    headers["X-Dev-User-Id"] = authOptions.devUserId;
  }
  if (authOptions.devFirebaseUid) {
    headers["X-Dev-Firebase-Uid"] = authOptions.devFirebaseUid;
  }
  if (authOptions.branchId) {
    headers["X-Current-Branch-Id"] = authOptions.branchId;
  }
  return headers;
}

/**
 * GET and download as file (PDF, CSV, etc.). On 200, triggers browser download; on 501/404 shows toast.
 */
export async function downloadFile(
  path: string,
  filename: string,
  onNotAvailable: (message: string) => void
): Promise<void> {
  if (!getApiBase()) {
    onNotAvailable("API not configured.");
    return;
  }
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { ...getAuthHeaders(), Accept: "*/*" },
    });
    if (res.status === 200) {
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const name = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? filename;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    if (res.status === 501) {
      onNotAvailable("Export not yet available.");
      return;
    }
    if (res.status === 404) {
      onNotAvailable("Not found.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    onNotAvailable((data as { error?: string }).error ?? `Request failed (${res.status}).`);
  } catch (e) {
    onNotAvailable(e instanceof Error ? e.message : "Network error.");
  }
}

/**
 * POST multipart form data (file upload). Returns JSON body or throws.
 */
export async function uploadFile(
  path: string,
  file: File,
  onSuccess: (data: { jobId?: string; imported?: number; message?: string }) => void,
  onError: (message: string) => void
): Promise<void> {
  if (!getApiBase()) {
    onError("API not configured.");
    return;
  }
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok || res.status === 202) {
      onSuccess(data as { jobId?: string; imported?: number; message?: string });
      return;
    }
    onError((data as { error?: string }).error ?? `Upload failed (${res.status}).`);
  } catch (e) {
    onError(e instanceof Error ? e.message : "Network error.");
  }
}

/** Build full URL for API. Path should start with / (e.g. /api/franchise/franchisees). */
function apiUrl(path: string): string {
  const base = getApiBase();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Query params; caller can pass URLSearchParams or Record. */
  params?: Record<string, string> | URLSearchParams;
};

/**
 * Call Cool Catch / franchise (or any) API. Path must include /api (e.g. /api/franchise/commission/runs).
 * Returns parsed JSON or throws with status and optional error body.
 * Use when NEXT_PUBLIC_API_URL is set; otherwise use mocks.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, params } = options;
  let url = apiUrl(path);
  if (params) {
    const search = params instanceof URLSearchParams ? params : new URLSearchParams(params);
    const qs = search.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  const headers = getAuthHeaders(body != null && method !== "GET");
  const res = await fetch(url, {
    method,
    headers,
    ...(body != null && method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error ?? `Request failed (${res.status})`) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data as T;
}
