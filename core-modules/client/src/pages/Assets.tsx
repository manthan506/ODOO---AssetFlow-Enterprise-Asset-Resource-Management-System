import { useState, useCallback, useEffect } from 'react'
import { Plus, Search, Package, History, MapPin, Tag as TagIcon, Share2 } from 'lucide-react'
import { api } from '../lib/api'
import type { Asset, AssetCategory, Department, Allocation, MaintenanceRequest } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Modal, StatusBadge, EmptyState } from '../lib/ui'

const conditions = ['New', 'Excellent', 'Good', 'Fair', 'Poor', 'Damaged']
const statuses = ['available', 'allocated', 'reserved', 'under_maintenance', 'lost', 'retired', 'disposed']
const statusLabels: Record<string, string> = {
  available: 'Available',
  allocated: 'Allocated',
  reserved: 'Reserved',
  under_maintenance: 'Under Maintenance',
  lost: 'Lost',
  retired: 'Retired',
  disposed: 'Disposed',
}

export function Assets() {
  const { user, hasRole } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [registerModal, setRegisterModal] = useState(false)
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null)

  const canRegister = hasRole('admin', 'asset_manager')

  const load = useCallback(async () => {
    const [{ assets }, { categories }, { departments }] = await Promise.all([
      api.listAssets(),
      api.listCategories(),
      api.listDepartments(),
    ])
    setAssets(assets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    setCategories(categories.sort((a, b) => a.name.localeCompare(b.name)))
    setDepartments(departments.sort((a, b) => a.name.localeCompare(b.name)))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = assets.filter((a) => {
    if (search) {
      const s = search.toLowerCase()
      if (!a.name.toLowerCase().includes(s) && !a.tag.toLowerCase().includes(s) && !(a.serial_number ?? '').toLowerCase().includes(s)) return false
    }
    if (filterCategory && a.category_id !== Number(filterCategory)) return false
    if (filterStatus && a.status !== filterStatus) return false
    if (filterDept && a.department_id !== Number(filterDept)) return false
    return true
  })

  const catName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? '—'
  const deptName = (id: number | null) => departments.find((d) => d.id === id)?.name ?? '—'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
          <p className="text-sm text-slate-500 mt-1">Register and track assets through their full lifecycle.</p>
        </div>
        {canRegister && <button className="btn-primary" onClick={() => setRegisterModal(true)}><Plus size={16} /> Register Asset</button>}
      </div>

      <div className="card p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Search by name, tag, or serial…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="">All Categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">All Statuses</option>{statuses.map((s) => <option key={s} value={s}>{statusLabels[s] ?? s}</option>)}</select>
          <select className="input" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}><option value="">All Departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Package size={40} />} title="No assets found" subtitle="Register a new asset or adjust your filters." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center"><Package size={20} /></div>
                  <div><h3 className="font-semibold text-slate-900 leading-tight">{a.name}</h3><p className="text-xs text-slate-400 mt-0.5">{a.tag}</p></div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600"><TagIcon size={14} className="text-slate-400" /> {a.category_name ?? catName(a.category_id)}</div>
                <div className="flex items-center gap-2 text-slate-600"><MapPin size={14} className="text-slate-400" /> {a.location || 'No location'}</div>
                <div className="flex items-center gap-2 text-slate-600"><Package size={14} className="text-slate-400" /> {a.department_name ?? deptName(a.department_id)}</div>
                {a.is_bookable && <div className="flex items-center gap-2 text-accent-600"><Share2 size={14} /> Shared / Bookable</div>}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">Condition: {a.condition}</span>
                <button onClick={() => setHistoryAsset(a)} className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1"><History size={14} /> History</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {registerModal && <RegisterModal categories={categories} departments={departments} onClose={() => setRegisterModal(false)} onSaved={load} />}
      {historyAsset && <HistoryModal asset={historyAsset} onClose={() => setHistoryAsset(null)} />}
    </div>
  )
}

function RegisterModal({ categories, departments, onClose, onSaved }: { categories: AssetCategory[]; departments: Department[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', serial_number: '', category_id: '', department_id: '', acquisition_date: '', acquisition_cost: '', condition: 'Good', location: '', is_bookable: false, notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    if (!form.name.trim()) { setError('Asset name is required'); setSaving(false); return }
    try {
      await api.createAsset({
        name: form.name,
        serial_number: form.serial_number || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        department_id: form.department_id ? Number(form.department_id) : null,
        acquisition_date: form.acquisition_date || null,
        acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : 0,
        condition: form.condition,
        location: form.location || null,
        is_bookable: form.is_bookable,
      })
      await onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to register asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Register New Asset" size="lg">
      <div className="space-y-4">
        {error && <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Asset Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dell Latitude 5440" /></div>
          <div><label className="label">Serial Number</label><input className="input" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="e.g. SN-12345" /></div>
          <div><label className="label">Category</label><select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Select category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Department</label><select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}><option value="">None</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div><label className="label">Acquisition Date</label><input type="date" className="input" value={form.acquisition_date} onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })} /></div>
          <div><label className="label">Acquisition Cost (for reports only)</label><input type="number" className="input" value={form.acquisition_cost} onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })} placeholder="0.00" /></div>
          <div><label className="label">Condition</label><select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{conditions.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="label">Location</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Floor 3, Room A" /></div>
        </div>
        <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.is_bookable} onChange={(e) => setForm({ ...form, is_bookable: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          <div><span className="text-sm font-medium text-slate-700">Shared / Bookable resource</span><p className="text-xs text-slate-400">Enable if this asset can be booked by time slot (e.g. meeting room, vehicle).</p></div>
        </label>
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-500 flex items-center gap-2"><TagIcon size={16} /> Asset Tag will be auto-generated (e.g. AF-0001) on save.</div>
        <div className="flex justify-end gap-3 pt-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Register Asset'}</button></div>
      </div>
    </Modal>
  )
}

function HistoryModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const [allocs, setAllocs] = useState<Allocation[]>([])
  const [maints, setMaints] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [{ allocations }, { maintenance }] = await Promise.all([
          api.listAllocations({ status: 'active' }),
          api.listMaintenance({ asset_id: asset.id }),
        ])
        if (cancelled) return
        setAllocs(allocations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        setMaints(maintenance.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [asset.id])

  return (
    <Modal open onClose={onClose} title={`History — ${asset.name}`} size="lg">
      {loading ? <div className="text-slate-400 py-8 text-center">Loading history…</div> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-slate-400">Tag:</span> <span className="font-medium text-slate-700">{asset.tag}</span></div>
            <div><span className="text-slate-400">Serial:</span> <span className="font-medium text-slate-700">{asset.serial_number ?? '—'}</span></div>
            <div><span className="text-slate-400">Condition:</span> <span className="font-medium text-slate-700">{asset.condition}</span></div>
            <div><span className="text-slate-400">Status:</span> <StatusBadge status={asset.status} /></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><History size={16} /> Allocation History</h3>
            {allocs.length === 0 ? <p className="text-sm text-slate-400 py-3">No allocations recorded.</p> : (
              <div className="space-y-2">
                {allocs.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-sm"><p className="font-medium text-slate-800">Assigned to {a.user_name ?? 'Unknown'}</p><p className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()} {a.expected_return_date && `· Expected return: ${new Date(a.expected_return_date).toLocaleDateString()}`}</p></div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><History size={16} /> Maintenance History</h3>
            {maints.length === 0 ? <p className="text-sm text-slate-400 py-3">No maintenance recorded.</p> : (
              <div className="space-y-2">
                {maints.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-sm"><p className="font-medium text-slate-800">{m.issue_description}</p><p className="text-xs text-slate-400">{new Date(m.created_at).toLocaleDateString()} · Priority: {m.priority}{m.raised_by_name ? ` · Raised by ${m.raised_by_name}` : ''}</p></div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
