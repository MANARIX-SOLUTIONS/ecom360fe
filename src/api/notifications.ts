/**
 * Notifications API
 */

import { api } from "./client";

export type NotificationResponse = {
  id: string;
  businessId: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export async function listNotifications(params?: {
  unreadOnly?: boolean;
  page?: number;
  size?: number;
}): Promise<PageResponse<NotificationResponse>> {
  const search = new URLSearchParams();
  if (params?.unreadOnly != null)
    search.set("unreadOnly", String(params.unreadOnly));
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  return api.get<PageResponse<NotificationResponse>>(
    `/notifications${qs ? `?${qs}` : ""}`,
  );
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationResponse> {
  return api.patch<NotificationResponse>(`/notifications/${id}/read`);
}
