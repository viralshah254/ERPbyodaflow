/**
 * API client for backend (erp_odaflow_backend).
 * When NEXT_PUBLIC_API_URL is set, requests are sent to the backend.
 *
 * Auth (see docs/COOL_CATCH_API_CONNECT.md):
 * - Production: Authorization: Bearer <firebase-id-token>
 * - Local dev: set NEXT_PUBLIC_ENABLE_DEV_AUTH=1 before using dev headers
 * - Dev: X-Dev-User-Id, X-Current-Branch-Id (set via setApiAuth or NEXT_PUBLIC_DEV_* env)
 */
import { canUseDevHeaders } from "@/lib/runtime-flags";

const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";
const ENV_DEV_USER_ID = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_DEV_USER_ID ?? "") : "";
const ENV_BRANCH_ID = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_CURRENT_BRANCH_ID ?? "") : "";

export function getApiBase(): string {
  return API_BASE.replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return !!API_BASE;
}

export function requireLiveApi(feature: string): void {
  if (!isApiConfigured()) {
    throw new Error(`${feature} requires a live API connection.`);
  }
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

/** Set auth options (e.g. from auth store after login). Merges into existing options — pass only the keys you want to update. */
export function setApiAuth(options: ApiAuthOptions): void {
  authOptions = { ...authOptions, ...options };
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
  const branchId = authOptions.branchId || ENV_BRANCH_ID;
  if (branchId) {
    headers["X-Current-Branch-Id"] = branchId;
  }
  if (headers["Authorization"]) {
    return headers;
  }
  if (!canUseDevHeaders()) {
    return headers;
  }
  const devUserId = authOptions.devUserId || ENV_DEV_USER_ID;
  if (devUserId) {
    headers["X-Dev-User-Id"] = devUserId;
  }
  if (authOptions.devFirebaseUid) {
    headers["X-Dev-Firebase-Uid"] = authOptions.devFirebaseUid;
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

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * POST multipart form data and return parsed JSON. Use for imports that need the response.
 */
export async function uploadFormData<T = unknown>(path: string, formData: FormData): Promise<T> {
  if (!getApiBase()) {
    throw new Error("API not configured.");
  }
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error ?? `Upload failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

/**
 * POST multipart form data (file upload). Returns JSON body or throws.
 */
export async function uploadFile(
  path: string,
  file: File,
  onSuccess: (data: { jobId?: string; imported?: number; message?: string }) => void,
  onError: (message: string) => void,
  formFields?: Record<string, string>
): Promise<void> {
  if (!getApiBase()) {
    onError("API not configured.");
    return;
  }
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const form = new FormData();
  form.append("file", file);
  Object.entries(formFields ?? {}).forEach(([key, value]) => {
    form.append(key, value);
  });
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
