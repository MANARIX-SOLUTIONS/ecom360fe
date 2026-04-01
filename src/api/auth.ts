/**
 * Auth API - login, demo request, refresh
 */

import { api, setAuth, clearAuth } from "./client";
export { ApiError } from "./client";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  email: string;
  fullName: string;
  businessId: string;
  role: string;
  planSlug?: string;
};

export type LoginRequest = { email: string; password: string };

export type DemoRequestPayload = {
  email: string;
  fullName: string;
  businessName: string;
  phone: string;
  message?: string;
  jobTitle?: string;
  city?: string;
  sector?: string;
};

export type DemoRequestAck = {
  message: string;
};

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>("/auth/login", credentials, { skipAuth: true });
  setAuth(
    { accessToken: data.accessToken, refreshToken: data.refreshToken },
    {
      fullName: data.fullName,
      email: data.email,
      businessId: data.businessId ? String(data.businessId) : "",
      role: data.role,
      planSlug: data.planSlug,
    }
  );
  return data;
}

/** Demande de démo — pas de JWT ; validation admin requise avant connexion. */
export async function submitDemoRequest(req: DemoRequestPayload): Promise<DemoRequestAck> {
  return api.post<DemoRequestAck>("/auth/demo-request", req, { skipAuth: true });
}

export async function refreshToken(): Promise<AuthResponse | null> {
  try {
    const refresh = localStorage.getItem("ecom360_refresh_token");
    if (!refresh) return null;
    const data = await api.post<AuthResponse>(
      "/auth/refresh",
      { refreshToken: refresh },
      { skipAuth: true }
    );
    setAuth(
      { accessToken: data.accessToken, refreshToken: data.refreshToken },
      {
        fullName: data.fullName,
        email: data.email,
        businessId: data.businessId ? String(data.businessId) : "",
        role: data.role,
        planSlug: data.planSlug,
      }
    );
    return data;
  } catch {
    return null;
  }
}

export function logout() {
  clearAuth();
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email }, { skipAuth: true });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/auth/reset-password", { token, newPassword }, { skipAuth: true });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post("/auth/change-password", { currentPassword, newPassword });
}
