import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, ArrowLeftRight, Wrench, Calendar, Clock, AlertTriangle,
  TrendingUp, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { api } from '../lib/api'
import type { Asset, Allocation, Booking, MaintenanceRequest, DashboardStats } from '../lib/types'
import { useAuth } from '../lib/auth'
import { StatusBadge, EmptyState } from '../lib/ui'

interface KPI {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  link?: string
}

export function Dashboard() {
  const { user } = useAuth()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [overdueAllocations, setOverdueAllocations] = useState<Allocation[]>([])
  const [upcomingReturns, setUpcomingReturns] = useState<Allocation[]>([])
  const [activeBookings, setActiveBookings] = useState<Booking[]>([])
  const [pendingMaintenance, setPendingMaintenance] = useState<MaintenanceRequest[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [statsRes, allocationsRes, bookingsRes, maintenanceRes] = await Promise.all([
          api.getDashboardStats(),
          api.listAllocations({ status: 'active' }),
          api.listBookings({ status: 'upcoming' }),
          api.listMaintenance({ status: 'pending' }),
        ])

        if (cancelled) return

        const stats: DashboardStats = statsRes.stats
        const activeAllocations: Allocation[] = allocationsRes.allocations
        const upcomingBookings: Booking[] = bookingsRes.bookings
        const pendingMaint: MaintenanceRequest[] = maintenanceRes.maintenance

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const overdue = activeAllocations.filter(
          (a) => a.expected_return_date && new Date(a.expected_return_date) < today
        )
        const upcoming = activeAllocations.filter((a) => {
          if (!a.expected_return_date) return false
          const d = new Date(a.expected_return_date)
          const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          return diff >= 0 && diff <= 7
        })

        setKpis([
          { label: 'Total Assets', value: stats.totalAssets, icon: <Package size={20} />, color: 'slate', link: '/assets' },
          { label: 'Assets Available', value: stats.availableAssets, icon: <Package size={20} />, color: 'success', link: '/assets' },
          { label: 'Assets Allocated', value: stats.allocatedAssets, icon: <ArrowLeftRight size={20} />, color: 'primary', link: '/allocations' },
          { label: 'Under Maintenance', value: stats.underMaintenance, icon: <Wrench size={20} />, color: 'warning', link: '/maintenance' },
          { label: 'Active Allocations', value: stats.activeAllocations, icon: <ArrowLeftRight size={20} />, color: 'accent', link: '/allocations' },
          { label: 'Overdue Allocations', value: stats.overdueAllocations, icon: <AlertTriangle size={20} />, color: 'slate', link: '/allocations' },
          { label: 'Pending Maintenance', value: stats.pendingMaintenance, icon: <Wrench size={20} />, color: 'warning', link: '/maintenance' },
          { label: 'Upcoming Bookings', value: stats.upcomingBookings, icon: <Calendar size={20} />, color: 'accent', link: '/bookings' },
          { label: 'Total Value', value: stats.totalValue, icon: <TrendingUp size={20} />, color: 'primary', link: '/assets' },
          { label: 'Total Users', value: stats.totalUsers, icon: <TrendingUp size={20} />, color: 'slate', link: '/assets' },
          { label: 'Upcoming Returns', value: upcoming.length, icon: <Clock size={20} />, color: 'primary', link: '/allocations' },
        ])

        setOverdueAllocations(overdue)
        setUpcomingReturns(upcoming)
        setActiveBookings(upcomingBookings)
        setPendingMaintenance(pendingMaint)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load dashboard data', err)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const colorMap: Record<string, string> = {
    success: 'bg-success-50 text-success-600 border-success-200',
    primary: 'bg-primary-50 text-primary-600 border-primary-200',
    warning: 'bg-warning-50 text-warning-600 border-warning-200',
    accent: 'bg-accent-50 text-accent-600 border-accent-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, {user?.name || 'User'} — here's your operational snapshot.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.link ?? '#'}
            className={`card p-4 border-l-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group ${colorMap[kpi.color]}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${colorMap[kpi.color]}`}>{kpi.icon}</div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/assets" className="btn-primary"><Package size={16} /> Register Asset</Link>
        <Link to="/bookings" className="btn-secondary"><Calendar size={16} /> Book Resource</Link>
        <Link to="/maintenance" className="btn-secondary"><Wrench size={16} /> Raise Maintenance Request</Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Overdue Returns */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
            <AlertTriangle size={18} className="text-error-500" />
            <h2 className="font-semibold text-slate-900">Overdue Returns</h2>
            <span className="ml-auto badge bg-error-100 text-error-700">{overdueAllocations.length}</span>
          </div>
          <div className="p-4">
            {overdueAllocations.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={40} />} title="No overdue returns" subtitle="All assets are on track." />
            ) : (
              <div className="space-y-2">
                {overdueAllocations.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-error-50 border border-error-100 hover:bg-error-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.asset_name ?? 'Unknown asset'}</p>
                      <p className="text-xs text-slate-500">{a.asset_tag} · Due {new Date(a.expected_return_date!).toLocaleDateString()}</p>
                    </div>
                    <Link to="/allocations" className="text-xs text-primary-600 font-medium hover:underline">View</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Returns */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
            <Clock size={18} className="text-primary-500" />
            <h2 className="font-semibold text-slate-900">Upcoming Returns</h2>
            <span className="ml-auto badge bg-primary-100 text-primary-700">{upcomingReturns.length}</span>
          </div>
          <div className="p-4">
            {upcomingReturns.length === 0 ? (
              <EmptyState icon={<Clock size={40} />} title="No upcoming returns" subtitle="Nothing due in the next 7 days." />
            ) : (
              <div className="space-y-2">
                {upcomingReturns.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.asset_name ?? 'Unknown asset'}</p>
                      <p className="text-xs text-slate-500">{a.asset_tag} · Due {new Date(a.expected_return_date!).toLocaleDateString()}</p>
                    </div>
                    <Link to="/allocations" className="text-xs text-primary-600 font-medium hover:underline">View</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Bookings */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
            <Calendar size={18} className="text-accent-500" />
            <h2 className="font-semibold text-slate-900">Active Bookings</h2>
            <span className="ml-auto badge bg-accent-100 text-accent-700">{activeBookings.length}</span>
          </div>
          <div className="p-4">
            {activeBookings.length === 0 ? (
              <EmptyState icon={<Calendar size={40} />} title="No active bookings" subtitle="No resources currently booked." />
            ) : (
              <div className="space-y-2">
                {activeBookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-accent-50 border border-accent-100 hover:bg-accent-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{b.asset_name ?? 'Unknown resource'}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(b.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {new Date(b.end_time).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Maintenance */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
            <Wrench size={18} className="text-warning-500" />
            <h2 className="font-semibold text-slate-900">Pending Maintenance</h2>
            <span className="ml-auto badge bg-warning-100 text-warning-700">{pendingMaintenance.length}</span>
          </div>
          <div className="p-4">
            {pendingMaintenance.length === 0 ? (
              <EmptyState icon={<Wrench size={40} />} title="No pending maintenance" subtitle="All maintenance requests resolved." />
            ) : (
              <div className="space-y-2">
                {pendingMaintenance.slice(0, 5).map((m) => (
                  <Link key={m.id} to="/maintenance" className="flex items-center justify-between p-3 rounded-lg bg-warning-50 border border-warning-100 hover:bg-warning-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.issue_description.slice(0, 50)}</p>
                      <p className="text-xs text-slate-500">Priority: {m.priority}</p>
                    </div>
                    <StatusBadge status={m.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
