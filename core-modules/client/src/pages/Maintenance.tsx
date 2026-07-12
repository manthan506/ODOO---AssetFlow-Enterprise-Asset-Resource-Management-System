import { useState, useEffect, useCallback } from 'react'
import { Wrench, Plus, Check, X, User, Clock } from 'lucide-react'
import { api } from '../lib/api'
import type { MaintenanceRequest, Asset } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Modal, StatusBadge, PriorityBadge, EmptyState } from '../lib/ui'

export function Maintenance() {
  const { user, hasRole } = useAuth()
  const [requests, setRequests] = useState<(MaintenanceRequest & { asset_name: string | null; asset_tag: string | null; raised_by_name: string | null; approved_by_name: string | null })[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [modal, setModal] = useState(false)
  const [filter, setFilter] = useState('all')

  const canApprove = hasRole('admin', 'asset_manager')

  const load = useCallback(async () => {
    try {
      const [{ maintenance }, { assets: assetList }] = await Promise.all([
        api.listMaintenance(),
        api.listAssets(),
      ])
      const sorted = [...maintenance].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRequests(sorted as any)
      setAssets([...assetList].sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      console.error('Failed to load maintenance data', err)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  const updateStatus = async (req: MaintenanceRequest & { asset_name: string | null }, newStatus: 'approved' | 'resolved', extra?: { technician_name?: string; resolution_notes?: string }) => {
    if (!user) return
    try {
      if (newStatus === 'approved') {
        await api.approveMaintenance(req.id, { technician_name: extra?.technician_name ?? 'Assigned Technician' })
      } else if (newStatus === 'resolved') {
        await api.resolveMaintenance(req.id, { resolution_notes: extra?.resolution_notes ?? 'Repair completed' })
      }
      await load()
    } catch (err) {
      console.error('Failed to update maintenance status', err)
    }
  }

  const statuses = ['all', 'pending', 'approved', 'resolved']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance Management</h1>
          <p className="text-sm text-slate-500 mt-1">Route repair requests through an approval workflow before work begins.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Raise Request</button>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
          <span className="badge bg-warning-100 text-warning-700">Pending</span><span>→</span>
          <span className="badge bg-success-100 text-success-700">Approved</span><span className="text-slate-400">or</span>
          <span className="badge bg-error-100 text-error-700">Rejected</span><span>→</span>
          <span className="badge bg-primary-100 text-primary-700">In Progress</span><span>→</span>
          <span className="badge bg-success-100 text-success-700">Resolved</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All Requests' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Wrench size={40} />} title="No maintenance requests" subtitle="Raise a request to start the approval workflow." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="card p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{r.asset_name ?? 'Unknown asset'}</h3>
                    <span className="text-xs text-slate-400">{r.asset_tag}</span>
                    <StatusBadge status={r.status} />
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{r.issue_description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><User size={12} /> {r.raised_by_name ?? 'Unknown'}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(r.created_at).toLocaleDateString()}</span>
                    {r.technician_name && <span>Technician: {r.technician_name}</span>}
                    {r.resolution_notes && <span>Resolution: {r.resolution_notes}</span>}
                  </div>
                </div>
                {canApprove && (
                  <div className="flex gap-2 flex-shrink-0">
                    {r.status === 'pending' && (<><button onClick={() => updateStatus(r, 'approved')} className="btn-primary py-1.5 text-xs"><Check size={14} /> Approve</button><button onClick={() => updateStatus(r, 'approved')} className="btn-secondary py-1.5 text-xs"><X size={14} /> Reject</button></>)}
                    {r.status === 'approved' && <button onClick={() => updateStatus(r, 'resolved', { resolution_notes: 'Repair completed' })} className="btn-primary py-1.5 text-xs"><Check size={14} /> Mark Resolved</button>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <RequestModal assets={assets} userId={user?.id ?? ''} onClose={() => setModal(false)} onSaved={load} />}
    </div>
  )
}

function RequestModal({ assets, userId, onClose, onSaved }: { assets: Asset[]; userId: string | number; onClose: () => void; onSaved: () => void }) {
  const [assetId, setAssetId] = useState<number | ''>('')
  const [issue, setIssue] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    if (!assetId) { setError('Select an asset'); setSaving(false); return }
    if (!issue.trim()) { setError('Describe the issue'); setSaving(false); return }
    try {
      await api.createMaintenance({ asset_id: assetId, issue_description: issue, priority: priority as any, photo_url: undefined })
      await onSaved()
      onClose()
    } catch (err) {
      console.error('Failed to create maintenance request', err)
      setError('Failed to submit request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Raise Maintenance Request" size="md">
      <div className="space-y-4">
        {error && <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        <div><label className="label">Asset</label><select className="input" value={assetId} onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}><option value="">Select an asset</option>{assets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}</select></div>
        <div><label className="label">Issue Description</label><textarea className="input" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe the problem…" /></div>
        <div><label className="label">Priority</label><select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>{['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
        <div className="flex justify-end gap-3 pt-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button></div>
      </div>
    </Modal>
  )
}
