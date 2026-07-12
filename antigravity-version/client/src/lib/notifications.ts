import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import type { Notification } from './types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const { notifications: notifs } = await api.listNotifications()
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n) => !n.is_read).length)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const markRead = useCallback(async (id: number) => {
    await api.markRead(id)
    load()
  }, [load])

  const markAllRead = useCallback(async () => {
    await api.markAllRead()
    load()
  }, [load])

  const deleteNotification = useCallback(async (id: number) => {
    await api.deleteNotification(id)
    load()
  }, [load])

  return { notifications, unreadCount, markRead, markAllRead, deleteNotification, refresh: load }
}
