import { useState, useCallback, useEffect } from 'react'
import { ArrowLeftRight, AlertTriangle, Check, ArrowRight } from 'lucide-react'
import { api } from '../lib/api'
import type { Asset, Allocation, TransferRequest, Department, User } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Modal, StatusBadge, EmptyState } from '../lib/ui'

export function Allocations() {
  const { user, hasRole } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [transfers, setTransfers] = useState<TransferRequest[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [tab, setTab] = useState<'active' | 'transfers'>('active')
  const [allocateModal, setAllocateModal] = useState(false)
  const [conflictAsset, setConflictAsset] = useState<Asset | null>(null)
  const [conflictHolder, setConflictHolder] = useState<User | null>(null)
  const [returnTarget, setReturnTarget] = useState<Allocation | null>(null)
  const [transferModal, setTransferModal] = useState(false)

  const canManage = hasRole('admin', 'asset_manager', 'department_head')

  const load = useCallback(async () => {
    const [a, al, tr, u, d] = await Promise.all([
      api.listAssets(),
      api.listAllocations(),
      api.listTransferRequests(),
      api.listUsers(),
      api.listDepartments(),
    ])
    setAssets(a.assets)
    setAllocations(
      al.allocations.sort(
        (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
      )
    )
    setTransfers(
      tr.transfers.sort(
        (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
      )
    )
    setUsers(u.users)
    setDepartments(d.departments)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const userName = (id: number | null) =>
    users.find((p) => p.id === id)?.name ?? 'Unknown'
  const deptName = (id: number | null) =>
    departments.find((d) => d.id === id)?.name ?? 'Unknown'
  const assetById = (id: number) => assets.find((a) => a.id === id) ?? null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = (a: Allocation) =>
    a.status === 'active' &&
    !!a.expected_return_date &&
    new Date(a.expected_return_date) < today

  const activeAllocations = allocations.filter((a) => a.status === 'active')
  const requestedTransfers = transfers.filter((t) => t.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocations & Transfers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage who holds what, with conflict handling and transfer workflows.
          </p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setAllocateModal(true)}>
            <ArrowLeftRight size={16} /> Allocate Asset
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'active'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Allocations ({activeAllocations.length})
        </button>
        <button
          onClick={() => setTab('transfers')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'transfers'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Transfer Requests ({requestedTransfers.length})
        </button>
      </div>

      {tab === 'active' ? (
        activeAllocations.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight size={40} />}
            title="No active allocations"
            subtitle="Allocate an asset to an employee or department."
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Asset</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Assigned To</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Allocated By</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Expected Return</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Status</th>
                    {canManage && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeAllocations.map((a) => {
                    const overdue = isOverdue(a)
                    return (
                      <tr
                        key={a.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          overdue ? 'bg-error-50/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">
                            {a.asset_name ?? assetById(a.asset_id)?.name ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {a.asset_tag ?? assetById(a.asset_id)?.tag}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {a.user_name ?? (a.user_id ? userName(a.user_id) : a.department_id ? deptName(a.department_id) : '—')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {a.allocated_by_name ?? userName(a.allocated_by)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {a.expected_return_date ? (
                            <span
                              className={
                                overdue
                                  ? 'text-error-600 font-medium flex items-center gap-1'
                                  : 'text-slate-600'
                              }
                            >
                              {overdue && <AlertTriangle size={14} />}
                              {new Date(a.expected_return_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400">No deadline</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={a.status} />
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setReturnTarget(a)}
                              className="text-xs text-primary-600 font-medium hover:underline"
                            >
                              Mark Returned
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-secondary" onClick={() => setTransferModal(true)}>
              <ArrowLeftRight size={16} /> Request Transfer
            </button>
          </div>
          {transfers.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight size={40} />}
              title="No transfer requests"
              subtitle="Request a transfer for an already-allocated asset."
            />
          ) : (
            <div className="space-y-3">
              {transfers.map((t) => {
                const asset = assetById(t.asset_id)
                return (
                  <div key={t.id} className="card p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900">
                            {asset?.name} ({asset?.tag})
                          </p>
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{userName(t.from_user_id)}</span>
                          <ArrowRight size={14} className="text-slate-400" />
                          <span>{t.to_user_id ? userName(t.to_user_id) : '—'}</span>
                        </div>
                        {t.reason && (
                          <p className="text-sm text-slate-500 mt-1">Reason: {t.reason}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          Requested by {userName(t.requested_by)} on{' '}
                          {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {canManage && t.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveTransfer(t.id)}
                            className="btn-primary py-1.5 text-xs"
                          >
                            <Check size={14} /> Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {allocateModal && (
        <AllocateModal
          assets={assets}
          users={users}
          departments={departments}
          onClose={() => setAllocateModal(false)}
          onSaved={load}
          onConflict={(asset, holder) => {
            setConflictAsset(asset)
            setConflictHolder(holder)
            setAllocateModal(false)
          }}
        />
      )}

      {conflictAsset && (
        <Modal
          open
          onClose={() => {
            setConflictAsset(null)
            setConflictHolder(null)
          }}
          title="Asset Already Allocated"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-error-50 border border-error-200 rounded-lg">
              <AlertTriangle size={24} className="text-error-500" />
              <div>
                <p className="font-medium text-slate-900">
                  {conflictAsset.name} ({conflictAsset.tag})
                </p>
                <p className="text-sm text-slate-600">
                  Currently held by{' '}
                  <span className="font-medium">{conflictHolder?.name}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              This asset is already allocated. You can request a transfer instead — a manager
              will need to approve it.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn-secondary"
                onClick={() => {
                  setConflictAsset(null)
                  setConflictHolder(null)
                }}
              >
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setTransferModal(true)
                  setConflictAsset(null)
                  setConflictHolder(null)
                }}
              >
                <ArrowRight size={16} /> Request Transfer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {returnTarget && (
        <ReturnModal
          allocation={returnTarget}
          assetName={returnTarget.asset_name ?? assetById(returnTarget.asset_id)?.name ?? ''}
          onClose={() => setReturnTarget(null)}
          onSaved={load}
        />
      )}
      {transferModal && (
        <TransferModal
          users={users}
          onClose={() => setTransferModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )

  async function approveTransfer(id: number) {
    try {
      await api.approveTransfer(id)
      await load()
    } catch (err: any) {
      console.error('Failed to approve transfer:', err.message)
    }
  }
}

function AllocateModal({
  assets,
  users,
  departments,
  onClose,
  onSaved,
  onConflict,
}: {
  assets: Asset[]
  users: User[]
  departments: Department[]
  onClose: () => void
  onSaved: () => void
  onConflict: (asset: Asset, holder: User) => void
}) {
  const [assetId, setAssetId] = useState<number | ''>('')
  const [assignType, setAssignType] = useState<'user' | 'department'>('user')
  const [userId, setUserId] = useState<number | ''>('')
  const [deptId, setDeptId] = useState<number | ''>('')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const availableAssets = assets.filter((a) => a.status === 'available')

  const save = async () => {
    setSaving(true)
    setError(null)
    if (!assetId) {
      setError('Select an asset')
      setSaving(false)
      return
    }
    if (assignType === 'user' && !userId) {
      setError('Select an employee')
      setSaving(false)
      return
    }
    if (assignType === 'department' && !deptId) {
      setError('Select a department')
      setSaving(false)
      return
    }
    try {
      await api.createAllocation({
        asset_id: assetId,
        user_id: assignType === 'user' ? (userId as number) : undefined,
        department_id: assignType === 'department' ? (deptId as number) : undefined,
        expected_return_date: expectedReturn || undefined,
      })
      onSaved()
      onClose()
    } catch (err: any) {
      if (err.suggestTransfer === true) {
        const asset = assets.find((a) => a.id === assetId)!
        const holderName = asset.allocated_user_name
        const holder: User = {
          id: 0,
          name: holderName ?? 'Unknown',
          email: '',
          role: 'employee',
          department_id: null,
          status: 'active',
        }
        onConflict(asset, holder)
      } else {
        setError(err.message || 'Failed to allocate asset')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Allocate Asset" size="md">
      <div className="space-y-4">
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="label">Asset</label>
          <select
            className="input"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select an available asset</option>
            {availableAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.tag})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Only assets with "Available" status can be allocated.
          </p>
        </div>
        <div>
          <label className="label">Assign To</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setAssignType('user')}
              className={`btn ${
                assignType === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Employee
            </button>
            <button
              onClick={() => setAssignType('department')}
              className={`btn ${
                assignType === 'department'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Department
            </button>
          </div>
          {assignType === 'user' ? (
            <select
              className="input"
              value={userId}
              onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select employee</option>
              {users
                .filter((p) => p.status === 'active')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
            </select>
          ) : (
            <select
              className="input"
              value={deptId}
              onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select department</option>
              {departments
                .filter((d) => d.status === 'active')
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          )}
        </div>
        <div>
          <label className="label">Expected Return Date (optional)</label>
          <input
            type="date"
            className="input"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Allocating…' : 'Allocate'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ReturnModal({
  allocation,
  assetName,
  onClose,
  onSaved,
}: {
  allocation: Allocation
  assetName: string
  onClose: () => void
  onSaved: () => void
}) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.returnAllocation(allocation.id, { return_condition_notes: notes || undefined })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to mark returned')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Return Asset" size="sm">
      <div className="space-y-4">
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <p className="text-sm text-slate-600">
          Returning <span className="font-medium">{assetName}</span>
        </p>
        <div>
          <label className="label">Check-in Notes</label>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any observations about the asset condition…"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Processing…' : 'Mark Returned'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function TransferModal({
  users,
  onClose,
  onSaved,
}: {
  users: User[]
  onClose: () => void
  onSaved: () => void
}) {
  const [assetId, setAssetId] = useState<number | ''>('')
  const [toUserId, setToUserId] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allocatedAssets, setAllocatedAssets] = useState<
    { asset: Asset; holder: string }[]
  >([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [{ allocations }, { assets: allAssets }] = await Promise.all([
          api.listAllocations({ status: 'active' }),
          api.listAssets(),
        ])
        if (cancelled) return
        const items = allocations.map((a) => {
          const asset = allAssets.find((x) => x.id === a.asset_id)!
          const holder = a.user_name ?? 'Unknown'
          return { asset, holder }
        })
        setAllocatedAssets(items)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    if (!assetId) {
      setError('Select an asset')
      setSaving(false)
      return
    }
    if (!toUserId) {
      setError('Select an employee to transfer to')
      setSaving(false)
      return
    }
    try {
      await api.createTransferRequest({
        asset_id: assetId,
        from_user_id: undefined,
        to_user_id: toUserId,
        reason: reason || undefined,
      })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to submit transfer request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Request Transfer" size="md">
      <div className="space-y-4">
        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="label">Asset (currently allocated)</label>
          <select
            className="input"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select an allocated asset</option>
            {allocatedAssets.map(({ asset, holder }) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.tag}) — held by {holder}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Transfer To</label>
          <select
            className="input"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select employee</option>
            {users
              .filter((p) => p.status === 'active')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="label">Reason</label>
          <textarea
            className="input"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this transfer needed?"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
