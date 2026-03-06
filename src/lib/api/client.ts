/**
 * API client for backend (erp_odaflow_backend).
 * When NEXT_PUBLIC_API_URL is set, requests are sent to the backend; otherwise stubs are used.
 */

const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL ?? "") : "";

export function getApiBase(): string {
  return API_BASE.replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return !!API_BASE;
}

/** Get auth headers. In production, use Firebase ID token or session. */
function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  // If you add Firebase auth token: headers["Authorization"] = `Bearer ${idToken}`;
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
