import { useState, useEffect, useCallback } from 'react'
import { listNotifications, markNotificationRead } from '@/api'
import type { NotificationResponse } from '@/api'

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!localStorage.getItem('ecom360_access_token')) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    setLoading(true)
    try {
      const [all, unread] = await Promise.all([
        listNotifications({ page: 0, size: 10 }),
        listNotifications({ unreadOnly: true, page: 0, size: 1 }),
      ])
      setNotifications(all.content)
      setUnreadCount(unread.totalElements)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      /* ignore */
    }
  }, [])

  return { notifications, unreadCount, loading, refetch: fetchNotifications, markRead }
}
