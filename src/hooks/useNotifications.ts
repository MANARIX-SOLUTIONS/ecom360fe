import { useSyncExternalStore, useCallback, useEffect } from "react";
import { listNotifications, markNotificationRead } from "@/api";
import type { NotificationResponse } from "@/api";
import { createSharedStore } from "@/hooks/createSharedStore";

type NotificationsState = {
  notifications: NotificationResponse[];
  unreadCount: number;
  loading: boolean;
};

const notificationsStore = createSharedStore<NotificationsState>({
  notifications: [],
  unreadCount: 0,
  loading: false,
});

async function fetchNotifications(): Promise<void> {
  if (!localStorage.getItem("ecom360_access_token")) {
    notificationsStore.setState({ notifications: [], unreadCount: 0, loading: false });
    return;
  }
  notificationsStore.setState((s) => (s.loading ? s : { ...s, loading: true }));
  return notificationsStore.run(async () => {
    try {
      const [all, unread] = await Promise.all([
        listNotifications({ page: 0, size: 10 }),
        listNotifications({ unreadOnly: true, page: 0, size: 1 }),
      ]);
      notificationsStore.setState({
        notifications: all.content,
        unreadCount: unread.totalElements,
        loading: false,
      });
    } catch {
      notificationsStore.setState({ notifications: [], unreadCount: 0, loading: false });
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("ecom360:auth-expired", () => {
    notificationsStore.setState({ notifications: [], unreadCount: 0, loading: false });
  });
}

export function useNotifications() {
  const { notifications, unreadCount, loading } = useSyncExternalStore(
    notificationsStore.subscribe,
    notificationsStore.getSnapshot,
    notificationsStore.getSnapshot
  );

  useEffect(() => {
    void fetchNotifications();
  }, []);

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

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
    markRead,
  };
}
