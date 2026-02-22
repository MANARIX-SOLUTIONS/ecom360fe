/**
 * API client for 360 PME Commerce backend.
 * Handles base URL, auth headers, token refresh, and error mapping.
 */

// Dev: backend direct. Prod: VITE_API_URL or '' for same-origin proxy.
// Set VITE_API_URL='' to use Vite proxy (/api → backend).
const API_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8080" : "");
const API_PREFIX = "/api/v1";
const REQUEST_TIMEOUT_MS = 30_000;

type RequestInitWithAuth = RequestInit & { skipAuth?: boolean };

function getAccessToken(): string | null {
  return localStorage.getItem("ecom360_access_token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("ecom360_refresh_token");
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("ecom360_access_token", access);
  localStorage.setItem("ecom360_refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("ecom360_access_token");
  localStorage.removeItem("ecom360_refresh_token");
}

export function clearAuth() {
  clearTokens();
  localStorage.removeItem("ecom360_auth");
  localStorage.removeItem("ecom360_user");
  localStorage.removeItem("ecom360_business_id");
  localStorage.removeItem("ecom360_role");
  localStorage.removeItem("ecom360_plan_slug");
}

export function setAuth(
  tokens: { accessToken: string; refreshToken: string },
  user?: { fullName: string; email: string; businessId: string; role: string; planSlug?: string }
) {
  setTokens(tokens.accessToken, tokens.refreshToken);
  localStorage.setItem("ecom360_auth", "true");
  if (user) {
    localStorage.setItem(
      "ecom360_user",
      JSON.stringify({ name: user.fullName, email: user.email })
    );
    if (user.businessId) localStorage.setItem("ecom360_business_id", user.businessId);
    if (user.role) localStorage.setItem("ecom360_role", mapRoleFromBackend(user.role));
    if (user.planSlug != null) localStorage.setItem("ecom360_plan_slug", user.planSlug);
    else localStorage.removeItem("ecom360_plan_slug");
    window.dispatchEvent(new Event("ecom360:auth-set"));
  }
}

/** Map backend role (proprietaire, PLATFORM_ADMIN, etc.) to frontend role */
function mapRoleFromBackend(role: string): string {
  if (!role) return "proprietaire";
  const r = role.toLowerCase();
  if (r === "platform_admin") return "super_admin";
  return r;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Parse error message from backend (ProblemDetail uses 'detail', validation uses 'errors') */
function parseErrorMessage(body: unknown, res: Response): string {
  if (!body || typeof body !== "object") return res.statusText || `Erreur ${res.status}`;
  const b = body as Record<string, unknown>;
  if (typeof b.detail === "string") return b.detail;
  if (typeof b.message === "string") return b.message;
  const errors = b.errors;
  if (errors && typeof errors === "object" && !Array.isArray(errors)) {
    const parts = Object.entries(errors)
      .map(([k, v]) => (typeof v === "string" ? `${k}: ${v}` : null))
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  return res.statusText || `Erreur ${res.status}`;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}${API_PREFIX}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      fullName?: string;
      email?: string;
      businessId?: string;
      role?: string;
      planSlug?: string;
    };
    setAuth(
      { accessToken: data.accessToken, refreshToken: data.refreshToken },
      data.email
        ? {
            fullName: data.fullName ?? "",
            email: data.email,
            businessId: data.businessId ? String(data.businessId) : "",
            role: data.role ?? "",
            planSlug: data.planSlug,
          }
        : undefined
    );
    if (data.planSlug != null) window.dispatchEvent(new Event("ecom360:plan-updated"));
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInitWithAuth = {}): Promise<T> {
  const { skipAuth, ...init } = options;
  const url = `${API_BASE}${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id":
      crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...(init.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (!skipAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error) {
      if (e.name === "AbortError") throw new ApiError("Délai dépassé — réessayez", 408);
    }
    throw new ApiError("Connexion impossible — vérifiez le réseau", 0, e);
  }
  clearTimeout(timeoutId);

  if (res.status === 401 && !skipAuth && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) headers.Authorization = `Bearer ${newToken}`;
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), REQUEST_TIMEOUT_MS);
      try {
        res = await fetch(url, { ...init, headers, signal: retryController.signal });
      } finally {
        clearTimeout(retryTimeoutId);
      }
    } else {
      clearAuth();
      window.dispatchEvent(new Event("ecom360:auth-expired"));
      throw new ApiError("Session expirée — veuillez vous reconnecter", 401);
    }
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json().catch(() => null);
    } catch {
      body = await res.text().catch(() => null);
    }
    if (res.status === 402) {
      const b = body as { code?: string; message?: string } | null;
      if (b?.code === "SUBSCRIPTION_REQUIRED") {
        window.dispatchEvent(new CustomEvent("ecom360:subscription-required", { detail: b }));
      }
    }
    const requestId = res.headers.get("X-Request-Id");
    const msg = parseErrorMessage(body, res);
    const errMsg = requestId ? `${msg} (ID: ${requestId})` : msg;
    throw new ApiError(errMsg, res.status, body);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json();
}

export const api = {
  get: <T>(path: string, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, init?: RequestInitWithAuth) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
