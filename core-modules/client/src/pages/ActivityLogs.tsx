import { useState, useEffect } from 'react'
import { Bell, Activity, Check, CheckCheck, AlertTriangle, Wrench, ArrowLeftRight, Calendar, ClipboardCheck, Package } from 'lucide-react'
import { api } from '../lib/api'
import type { Notification, ActivityLog } from '../lib/types'
import { useAuth } from '../lib/auth'
import { useNotifications } from '../lib/notifications'
import { EmptyState } from '../lib/ui'

export function ActivityLogs() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'notifications' | 'logs'>('notifications')
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  useEffect(() => {
    api.getActivityLogs(100)
      .then(({ logs }) => setLogs(logs))
      .catch(() => setLogs([]))
  }, [])

  const notifIcon = (type: string) => {
    if (type.includes('overdue')) return <AlertTriangle size={18} className="text-error-500" />
    if (type.includes('maintenance')) return <Wrench size={18} className="text-warning-500" />
    if (type.includes('transfer')) return <ArrowLeftRight size={18} className="text-accent-500" />
    if (type.includes('booking')) return <Calendar size={18} className="text-accent-500" />
    if (type.includes('audit')) return <ClipboardCheck size={18} className="text-primary-500" />
    if (type.includes('asset')) return <Package size={18} className="text-primary-500" />
    return <Bell size={18} className="text-slate-400" />
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity & Notifications</h1>
        <p className="text-sm text-slate-500 mt-1">Stay informed about all asset, maintenance, and booking activity.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button onClick={() => setTab('notifications')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'notifications' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Bell size={18} /> Notifications
          {unreadCount > 0 && <span className="bg-error-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{unreadCount}</span>}
        </button>
        <button onClick={() => setTab('logs')} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'logs' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <Activity size={18} /> Activity Log
        </button>
      </div>

      {tab === 'notifications' ? (
        <div>
          {unreadCount > 0 && <div className="flex justify-end mb-3"><button onClick={markAllRead} className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1"><CheckCheck size={16} /> Mark all as read</button></div>}
          {notifications.length === 0 ? (
            <EmptyState icon={<Bell size={40} />} title="No notifications" subtitle="You're all caught up!" />
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div key={n.id} className={`card p-4 flex items-start gap-3 hover:shadow-sm transition-shadow ${n.is_read ? 'opacity-60' : 'border-l-4 border-l-primary-500'}`}>
                  <div className="mt-0.5">{notifIcon(n.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-900">{n.message}</p><span className="text-xs text-slate-400">{timeAgo(n.created_at)}</span></div>
                  </div>
                  {!n.is_read && <button onClick={() => markRead(n.id)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors" title="Mark as read"><Check size={16} /></button>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {logs.length === 0 ? (
            <EmptyState icon={<Activity size={40} />} title="No activity yet" subtitle="Actions across the platform will appear here." />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">User</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Action</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Entity</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-700">{l.user_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{l.action}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{l.entity_type ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
