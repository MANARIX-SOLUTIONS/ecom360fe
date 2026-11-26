import { useSyncExternalStore, useCallback, useEffect } from "react";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api";
import type { NotificationResponse } from "@/api";
import { createSharedStore } from "@/hooks/createSharedStore";

type NotificationsState = {
  notifications: NotificationResponse[];
  unreadCount: number;
  loading: boolean;
  hasError: boolean;
};

type UseNotificationsOptions = {
  listSize?: number;
  pollingIntervalMs?: number;
};

const DEFAULT_LIST_SIZE = 10;

const notificationsStore = createSharedStore<NotificationsState>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  hasError: false,
});

async function fetchNotifications(listSize = DEFAULT_LIST_SIZE): Promise<void> {
  if (!localStorage.getItem("ecom360_access_token")) {
    notificationsStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      hasError: false,
    });
    return;
  }
  notificationsStore.setState((s) => (s.loading ? s : { ...s, loading: true }));
  return notificationsStore.run(async () => {
    try {
      const [all, unreadCountValue] = await Promise.all([
        listNotifications({ page: 0, size: listSize }),
        getUnreadNotificationCount(),
      ]);
      notificationsStore.setState({
        notifications: all.content,
        unreadCount: unreadCountValue,
        loading: false,
        hasError: false,
      });
    } catch {
      notificationsStore.setState({
        notifications: [],
        unreadCount: 0,
        loading: false,
        hasError: true,
      });
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("ecom360:auth-expired", () => {
    notificationsStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      hasError: false,
    });
  });
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { listSize = DEFAULT_LIST_SIZE, pollingIntervalMs = 0 } = options;

  const { notifications, unreadCount, loading, hasError } = useSyncExternalStore(
    notificationsStore.subscribe,
    notificationsStore.getSnapshot,
    notificationsStore.getSnapshot
  );

  const refetch = useCallback(() => fetchNotifications(listSize), [listSize]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!pollingIntervalMs) return undefined;
    const intervalId = window.setInterval(() => {
      void refetch();
    }, pollingIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [refetch, pollingIntervalMs]);

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      notificationsStore.setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch {
      /* ignore */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      notificationsStore.setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      /* ignore */
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    hasError,
    refetch,
    markRead,
    markAllRead,
  };
}
