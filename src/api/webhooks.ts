/**
 * Outbound webhooks management
 */

import { api } from "./client";

export type WebhookResponse = {
  id: string;
  businessId: string;
  url: string;
  events: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookCreateResponse = WebhookResponse & {
  secret: string;
};

export type WebhookRequest = {
  url: string;
  events: string;
  isActive?: boolean;
};

export type WebhookTestResponse = {
  success: boolean;
  httpStatus: number;
  message: string;
  durationMs: number;
};

export async function listWebhooks(): Promise<WebhookResponse[]> {
  return api.get<WebhookResponse[]>("/webhooks");
}

export async function createWebhook(req: WebhookRequest): Promise<WebhookCreateResponse> {
  return api.post<WebhookCreateResponse>("/webhooks", req);
}

export async function updateWebhook(id: string, req: WebhookRequest): Promise<WebhookResponse> {
  return api.put<WebhookResponse>(`/webhooks/${id}`, req);
}

export async function deleteWebhook(id: string): Promise<void> {
  return api.delete<void>(`/webhooks/${id}`);
}

export async function testWebhook(id: string): Promise<WebhookTestResponse> {
  return api.post<WebhookTestResponse>(`/webhooks/${id}/test`);
}
