/**
 * API keys management
 */

import { api } from "./client";

export type ApiKeyResponse = {
  id: string;
  businessId: string;
  label: string;
  permissions: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  rawKey?: string | null;
};

export type ApiKeyRequest = {
  label: string;
  permissions: string;
  expiresAt?: string | null;
};

export async function listApiKeys(): Promise<ApiKeyResponse[]> {
  return api.get<ApiKeyResponse[]>("/api-keys");
}

export async function createApiKey(req: ApiKeyRequest): Promise<ApiKeyResponse> {
  return api.post<ApiKeyResponse>("/api-keys", req);
}

export async function revokeApiKey(id: string): Promise<void> {
  return api.delete<void>(`/api-keys/${id}`);
}
