/**
 * Commerce connections + ingestion journal API
 */

import { api } from "./client";
import type { PageResponse } from "./products";

export type CommerceSourceType = "WOOCOMMERCE" | "GENERIC_WEBHOOK" | string;

export type CommerceConnectionResponse = {
  id: string;
  businessId: string;
  storeId: string;
  sourceType: CommerceSourceType;
  label: string;
  incomingWebhookPath: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommerceConnectionCreateResponse = CommerceConnectionResponse & {
  hmacSecret: string;
};

export type CommerceConnectionCreateRequest = {
  storeId: string;
  sourceType: CommerceSourceType;
  label: string;
};

export type CommerceIngestionLogResponse = {
  id: string;
  connectionId: string;
  businessId: string;
  sourceType: string;
  externalOrderId: string;
  status: string;
  errorMessage: string | null;
  saleId: string | null;
  createdAt: string;
};

export async function listCommerceConnections(): Promise<CommerceConnectionResponse[]> {
  return api.get<CommerceConnectionResponse[]>("/commerce/connections");
}

export async function createCommerceConnection(
  req: CommerceConnectionCreateRequest
): Promise<CommerceConnectionCreateResponse> {
  return api.post<CommerceConnectionCreateResponse>("/commerce/connections", req);
}

export async function updateCommerceConnection(
  id: string,
  req: { isActive: boolean }
): Promise<CommerceConnectionResponse> {
  return api.patch<CommerceConnectionResponse>(`/commerce/connections/${id}`, req);
}

export async function deleteCommerceConnection(id: string): Promise<void> {
  return api.delete<void>(`/commerce/connections/${id}`);
}

export async function listCommerceIngestions(params?: {
  connectionId?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<CommerceIngestionLogResponse>> {
  const search = new URLSearchParams();
  if (params?.connectionId) search.set("connectionId", params.connectionId);
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<PageResponse<CommerceIngestionLogResponse>>(
    `/commerce/ingestions${qs ? `?${qs}` : ""}`
  );
}
