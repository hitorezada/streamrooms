// Access token lives in memory only (never localStorage) — the refresh
// token in the httpOnly cookie is what survives a page reload.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        setAccessToken(data.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Erro inesperado." }));
    throw new ApiError(res.status, body.error ?? "Erro inesperado.");
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Separate from `request()` because multipart uploads must NOT get the
// forced `Content-Type: application/json` header — the browser needs to set
// its own boundary-bearing multipart content type on the FormData body.
async function uploadFile<T>(path: string, file: File, retry = true): Promise<T> {
  const headers = new Headers();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api${path}`, { method: "POST", headers, body: formData, credentials: "include" });

  if (res.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) return uploadFile<T>(path, file, false);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Erro ao enviar arquivo." }));
    throw new ApiError(res.status, body.error ?? "Erro ao enviar arquivo.");
  }

  return res.json();
}

export { ApiError, refreshSession, uploadFile };
