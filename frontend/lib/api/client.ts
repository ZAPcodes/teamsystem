// ─── Perx API Client ──────────────────────────────────────────────────────
// All browser traffic uses same-origin `/api/*`, proxied to the backend via
// next.config.ts (local) or Vercel rewrites (production BACKEND_URL).

import { useSessionStore } from "@/lib/store/session";

/** Same-origin API prefix — proxied to Render in production. */
export const API_PREFIX = "/api";

export function getApiBase(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  return API_PREFIX;
}

const BASE = getApiBase();

function getToken(): string | null {
  return useSessionStore.getState().token;
}

function handleUnauthorized() {
  useSessionStore.getState().clearSession();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new Error(
      BASE === API_PREFIX
        ? "Cannot reach the Perx API. Check that the backend is running and BACKEND_URL is set for production."
        : `Cannot reach the Perx API at ${BASE}. Start the backend with npm run dev in the backend folder.`
    );
  }

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized");
  }

  const data = await res.json();

  if (!res.ok) {
    const msg =
      (data as { error?: { message?: string } })?.error?.message ??
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export const apiGet = <T>(path: string, signal?: AbortSignal) =>
  apiFetch<T>("GET", path, undefined, signal);

export const apiPost = <T>(path: string, body?: unknown) =>
  apiFetch<T>("POST", path, body);

export const apiPatch = <T>(path: string, body?: unknown) =>
  apiFetch<T>("PATCH", path, body);

export const apiDelete = <T>(path: string) =>
  apiFetch<T>("DELETE", path);
