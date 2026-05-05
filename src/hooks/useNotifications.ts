import { useState, useEffect, useCallback } from "react";
import { getUnreadNotificationCount, listNotifications, markNotificationRead } from "@/api";
import type { NotificationResponse } from "@/api";

type UseNotificationsOptions = {
  listSize?: number;
  pollingIntervalMs?: number;
};

const DEFAULT_LIST_SIZE = 10;

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { listSize = DEFAULT_LIST_SIZE, pollingIntervalMs = 0 } = options;
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const [all, unreadCountValue] = await Promise.all([
        listNotifications({ page: 0, size: listSize }),
        getUnreadNotificationCount(),
      ]);
      setNotifications(all.content);
      setUnreadCount(unreadCountValue);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [listSize]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!pollingIntervalMs) return undefined;
    const intervalId = window.setInterval(() => {
      fetchNotifications();
    }, pollingIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [fetchNotifications, pollingIntervalMs]);

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
    markRead,
  };
}
