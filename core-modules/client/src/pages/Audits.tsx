import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, Plus, Check, X, AlertCircle, FileText, Lock } from 'lucide-react'
import { api } from '../lib/api'
import type { AuditCycle, AuditItem, Asset, Department, User } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Modal, StatusBadge, EmptyState, ConfirmDialog } from '../lib/ui'

export function Audits() {
  const { user, hasRole } = useAuth()
  const [cycles, setCycles] = useState<AuditCycle[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [modal, setModal] = useState(false)
  const [detailCycle, setDetailCycle] = useState<AuditCycle | null>(null)

  const canCreate = hasRole('admin', 'asset_manager')

  const load = useCallback(async () => {
    const [cyclesRes, usersRes, assetsRes, deptsRes] = await Promise.all([
      api.listAuditCycles(),
      api.listUsers(),
      api.listAssets(),
      api.listDepartments(),
    ])
    setCycles(cyclesRes.cycles)
    setUsers(usersRes.users.sort((a, b) => a.name.localeCompare(b.name)))
    setAssets(assetsRes.assets.sort((a, b) => a.name.localeCompare(b.name)))
    setDepartments(deptsRes.departments.sort((a, b) => a.name.localeCompare(b.name)))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asset Audits</h1>
          <p className="text-sm text-slate-500 mt-1">Run structured verification cycles with assigned auditors and auto-generated discrepancy reports.</p>
        </div>
        {canCreate && <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> New Audit Cycle</button>}
      </div>

      {cycles.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={40} />} title="No audit cycles" subtitle="Create an audit cycle to start verifying assets." />
      ) : (
        <div className="space-y-3">
          {cycles.map((c) => (
            <div key={c.id} className="card p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{c.title}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                    <span>Scope: {c.scope || 'All assets'}</span>
                    {c.created_by_name && <span>Created by {c.created_by_name}</span>}
                    {typeof c.total_items === 'number' && <span>{c.total_items} items</span>}
                    {typeof c.discrepancy_count === 'number' && c.discrepancy_count > 0 && <span className="text-error-600">{c.discrepancy_count} discrepancies</span>}
                    <span>{new Date(c.started_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => setDetailCycle(c)} className="btn-secondary py-1.5 text-xs"><FileText size={14} /> View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <CreateCycleModal departments={departments} users={users} assets={assets} onClose={() => setModal(false)} onSaved={load} />}
      {detailCycle && <CycleDetailModal cycle={detailCycle} canEdit={canCreate} onClose={() => setDetailCycle(null)} onSaved={load} />}
    </div>
  )
}

function CreateCycleModal({ departments, users, assets, onClose, onSaved }: { departments: Department[]; users: User[]; assets: Asset[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [auditorIds, setAuditorIds] = useState<number[]>([])
  const [assetIds, setAssetIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleAuditor = (id: number) => setAuditorIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleAsset = (id: number) => setAssetIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const save = async () => {
    setSaving(true)
    setError(null)
    if (!title.trim()) { setError('Title is required'); setSaving(false); return }
    try {
      await api.createAuditCycle({ title: title.trim(), scope: scope.trim() || undefined, auditor_ids: auditorIds, asset_ids: assetIds })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to create cycle')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Create Audit Cycle" size="md">
      <div className="space-y-4">
        {error && <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        <div><label className="label">Cycle Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q3 2025 Asset Audit" /></div>
        <div><label className="label">Scope (optional)</label><input className="input" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g. All assets, or a department / location description" /></div>
        <div>
          <label className="label">Assign Auditors</label>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
            {users.filter((u) => u.status === 'active').map((u) => (
              <label key={u.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                <input type="checkbox" checked={auditorIds.includes(u.id)} onChange={() => toggleAuditor(u.id)} className="w-4 h-4 rounded border-slate-300 text-primary-600" />
                <span className="text-sm text-slate-700">{u.name}</span><span className="text-xs text-slate-400">({u.role})</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Scope Assets (leave empty for all non-retired assets)</label>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
            {assets.map((a) => (
              <label key={a.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded">
                <input type="checkbox" checked={assetIds.includes(a.id)} onChange={() => toggleAsset(a.id)} className="w-4 h-4 rounded border-slate-300 text-primary-600" />
                <span className="text-sm text-slate-700">{a.name}</span><span className="text-xs text-slate-400">({a.tag})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create Cycle'}</button></div>
      </div>
    </Modal>
  )
}

function CycleDetailModal({ cycle, canEdit, onClose, onSaved }: { cycle: AuditCycle; canEdit: boolean; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { items } = await api.getAuditCycle(cycle.id)
      setItems(items)
    } catch (e: any) {
      setError(e.message || 'Failed to load cycle')
    } finally {
      setLoading(false)
    }
  }, [cycle.id])

  useEffect(() => { load() }, [load])

  const setResult = async (item: AuditItem, status: 'verified' | 'discrepancy', discrepancyNotes: string | null) => {
    try {
      await api.updateAuditItem(item.id, { status, discrepancy_notes: discrepancyNotes ?? undefined })
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to update item')
    }
  }

  const closeCycle = async () => {
    try {
      await api.closeAuditCycle(cycle.id)
      setCloseConfirm(false)
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to close cycle')
      setCloseConfirm(false)
    }
  }

  const verified = items.filter((i) => i.status === 'verified').length
  const discrepancy = items.filter((i) => i.status === 'discrepancy').length
  const pending = items.filter((i) => i.status === 'pending').length

  const isClosed = cycle.status === 'completed'

  return (
    <Modal open onClose={onClose} title={cycle.title} size="lg">
      <div className="space-y-4">
        {error && <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-success-50 border border-success-200 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-success-700">{verified}</p><p className="text-xs text-success-600">Verified</p></div>
          <div className="bg-error-50 border border-error-200 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-error-700">{discrepancy}</p><p className="text-xs text-error-600">Discrepancies</p></div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-slate-600">{pending}</p><p className="text-xs text-slate-500">Pending</p></div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-slate-600">{items.length}</p><p className="text-xs text-slate-500">Total</p></div>
        </div>

        {discrepancy > 0 && (
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2"><AlertCircle size={18} className="text-error-600" /><h3 className="font-semibold text-error-700 text-sm">Discrepancy Report (Auto-generated)</h3></div>
            <div className="space-y-1">
              {items.filter((i) => i.status === 'discrepancy').map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{i.asset_name} ({i.asset_tag})</span>
                  <span className="badge bg-error-100 text-error-700">{i.discrepancy_notes || 'Discrepancy'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Asset</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Tag</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Current Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Result</th>
                  {canEdit && !isClosed && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={canEdit && !isClosed ? 5 : 4} className="px-4 py-6 text-center text-sm text-slate-400">Loading…</td></tr>
                ) : items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{i.asset_name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{i.asset_tag ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{i.asset_current_status ?? '—'}</td>
                    <td className="px-4 py-3">{i.status === 'pending' ? <span className="text-xs text-slate-400">Pending</span> : <StatusBadge status={i.status} />}</td>
                    {canEdit && !isClosed && <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => setResult(i, 'verified', null)} className="p-1.5 rounded-lg text-success-600 hover:bg-success-50 transition-colors" title="Verified"><Check size={16} /></button><button onClick={() => setResult(i, 'discrepancy', 'Missing')} className="p-1.5 rounded-lg text-error-600 hover:bg-error-50 transition-colors" title="Missing"><X size={16} /></button><button onClick={() => setResult(i, 'discrepancy', 'Damaged')} className="p-1.5 rounded-lg text-warning-600 hover:bg-warning-50 transition-colors" title="Damaged"><AlertCircle size={16} /></button></div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {canEdit && !isClosed && <div className="flex justify-end"><button onClick={() => setCloseConfirm(true)} className="btn-danger"><Lock size={16} /> Close Audit Cycle</button></div>}
      </div>
      <ConfirmDialog open={closeConfirm} onClose={() => setCloseConfirm(false)} onConfirm={closeCycle} title="Close Audit Cycle" message="Closing will lock the cycle. This cannot be undone." confirmLabel="Close & Lock" />
    </Modal>
  )
}
