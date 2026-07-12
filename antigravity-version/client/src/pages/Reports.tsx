import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Wrench, Package, Building2, Calendar, Download } from 'lucide-react'
import { api } from '../lib/api'
import type { Asset, Allocation, MaintenanceRequest, Booking, Department } from '../lib/types'

type StatusBreakdown = { status: string; count: number }[]

export function Reports() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.listAssets(),
      api.listAllocations(),
      api.listMaintenance(),
      api.listBookings(),
      api.listDepartments(),
      api.getStatusBreakdown(),
      api.getCategoryBreakdown(),
    ])
      .then(([a, al, m, b, d, sb]) => {
        if (cancelled) return
        setAssets(a.assets)
        setAllocations(al.allocations)
        setMaintenance(m.maintenance)
        setBookings(b.bookings)
        setDepartments(d.departments)
        setStatusBreakdown(sb.breakdown)
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load reports data', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Status distribution comes from the server-side status-breakdown report.
  const totalForBreakdown = statusBreakdown.reduce((sum, s) => sum + s.count, 0)

  const allocCountByAsset: Record<number, number> = {}
  allocations.forEach((a) => { allocCountByAsset[a.asset_id] = (allocCountByAsset[a.asset_id] ?? 0) + 1 })
  const sortedByUse = Object.entries(allocCountByAsset).sort((a, b) => b[1] - a[1])
  const assetName = (id: number) => assets.find((a) => a.id === id)?.name ?? 'Unknown'
  const mostUsed = sortedByUse.slice(0, 5)
  const idleAssets = assets.filter((a) => !allocCountByAsset[a.id] && a.status === 'available')

  const maintCountByAsset: Record<number, number> = {}
  maintenance.forEach((m) => { maintCountByAsset[m.asset_id] = (maintCountByAsset[m.asset_id] ?? 0) + 1 })
  const maintFreq = Object.entries(maintCountByAsset).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const deptAllocations: Record<number, number> = {}
  allocations.filter((a) => a.status === 'active').forEach((a) => {
    const asset = assets.find((x) => x.id === a.asset_id)
    if (asset?.department_id) deptAllocations[asset.department_id] = (deptAllocations[asset.department_id] ?? 0) + 1
  })

  const hourCounts: number[] = Array(24).fill(0)
  bookings.forEach((b) => { hourCounts[new Date(b.start_time).getHours()]++ })
  const maxHour = Math.max(...hourCounts, 1)

  const oldAssets = assets.filter((a) => a.acquisition_date && new Date(a.acquisition_date) < new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)).sort((a, b) => new Date(a.acquisition_date!).getTime() - new Date(b.acquisition_date!).getTime())

  const exportCSV = () => {
    const rows = [['Asset Name', 'Tag', 'Status', 'Department', 'Location', 'Condition', 'Acquisition Date', 'Cost'],
      ...assets.map((a) => [a.name, a.tag, a.status, departments.find((d) => d.id === a.department_id)?.name ?? '', a.location ?? '', a.condition, a.acquisition_date ?? '', String(a.acquisition_cost ?? '')])]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'assetflow_report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const deptName = (id: number) => departments.find((d) => d.id === id)?.name ?? 'Unknown'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Operational insights across assets, maintenance, and bookings.</p>
        </div>
        <button className="btn-secondary" onClick={exportCSV}><Download size={16} /> Export CSV</button>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Package size={18} /> Asset Status Distribution</h2>
        <div className="space-y-2">
          {statusBreakdown.map(({ status, count }) => (
            <div key={status} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-32 truncate">{status}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2" style={{ width: `${totalForBreakdown ? (count / totalForBreakdown) * 100 : 0}%` }}>
                  <span className="text-xs text-white font-medium">{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} /> Most Used Assets</h2>
          {mostUsed.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No allocation data yet.</p> : (
            <div className="space-y-2">
              {mostUsed.map(([id, count]) => (<div key={id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"><span className="text-sm text-slate-700">{assetName(Number(id))}</span><span className="text-xs font-medium text-primary-600">{count} allocations</span></div>))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Package size={18} /> Idle Assets (Never Allocated)</h2>
          {idleAssets.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">All assets have been allocated at least once.</p> : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {idleAssets.slice(0, 10).map((a) => (<div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-sm"><span className="text-slate-700">{a.name}</span><span className="text-xs text-slate-400">{a.tag}</span></div>))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Wrench size={18} /> Maintenance Frequency</h2>
          {maintFreq.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No maintenance data yet.</p> : (
            <div className="space-y-2">
              {maintFreq.map(([id, count]) => (<div key={id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"><span className="text-sm text-slate-700">{assetName(Number(id))}</span><span className="text-xs font-medium text-warning-600">{count} requests</span></div>))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Building2 size={18} /> Department-wise Allocations</h2>
          {Object.keys(deptAllocations).length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No active allocations.</p> : (
            <div className="space-y-2">
              {Object.entries(deptAllocations).map(([id, count]) => (<div key={id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"><span className="text-sm text-slate-700">{deptName(Number(id))}</span><span className="text-xs font-medium text-primary-600">{count} active</span></div>))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Calendar size={18} /> Booking Heatmap (Peak Usage Hours)</h2>
        <div className="flex items-end gap-1 h-32">
          {hourCounts.map((count, hour) => (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-accent-500 transition-all duration-500 hover:bg-accent-600" style={{ height: `${(count / maxHour) * 100}%`, minHeight: count > 0 ? '4px' : '0' }} title={`${hour}:00 — ${count} bookings`} />
              {hour % 3 === 0 && <span className="text-xs text-slate-400">{hour}</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">Each bar represents booking volume for that hour of the day.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 size={18} /> Assets Nearing Retirement (5+ years old)</h2>
        {oldAssets.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No old assets.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200"><tr><th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Asset</th><th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Tag</th><th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Acquired</th><th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Condition</th><th className="text-left text-xs font-semibold text-slate-500 uppercase px-3 py-2">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {oldAssets.map((a) => (<tr key={a.id} className="hover:bg-slate-50 transition-colors"><td className="px-3 py-2 text-sm text-slate-700">{a.name}</td><td className="px-3 py-2 text-sm text-slate-500">{a.tag}</td><td className="px-3 py-2 text-sm text-slate-500">{a.acquisition_date}</td><td className="px-3 py-2 text-sm text-slate-500">{a.condition}</td><td className="px-3 py-2 text-sm text-slate-500">{a.status}</td></tr>))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
