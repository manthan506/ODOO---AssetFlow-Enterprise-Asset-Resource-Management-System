import { useState, useCallback, useEffect } from 'react'
import { Building2, Tag, Users, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import type { Department, AssetCategory, User, Role } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Modal, ConfirmDialog, EmptyState } from '../lib/ui'

type Tab = 'departments' | 'categories' | 'employees'

export function OrganizationSetup() {
  const [tab, setTab] = useState<Tab>('departments')
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [users, setUsers] = useState<User[]>([])

  const load = useCallback(async () => {
    const [deptRes, catRes, userRes] = await Promise.all([
      api.listDepartments(),
      api.listCategories(),
      api.listUsers(),
    ])
    setDepartments([...deptRes.departments].sort((a, b) => a.name.localeCompare(b.name)))
    setCategories([...catRes.categories].sort((a, b) => a.name.localeCompare(b.name)))
    setUsers([...userRes.users].sort((a, b) => a.name.localeCompare(b.name)))
  }, [])

  useEffect(() => { load() }, [load])

  const tabs = [
    { id: 'departments' as Tab, label: 'Departments', icon: <Building2 size={18} /> },
    { id: 'categories' as Tab, label: 'Asset Categories', icon: <Tag size={18} /> },
    { id: 'employees' as Tab, label: 'Employee Directory', icon: <Users size={18} /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organization Setup</h1>
        <p className="text-sm text-slate-500 mt-1">Manage master data: departments, asset categories, and employees.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'departments' && <DepartmentsTab departments={departments} users={users} onChanged={load} />}
      {tab === 'categories' && <CategoriesTab categories={categories} onChanged={load} />}
      {tab === 'employees' && <EmployeesTab users={users} departments={departments} onChanged={load} />}
    </div>
  )
}

function DepartmentsTab({ departments, users, onChanged }: { departments: Department[]; users: User[]; onChanged: () => void }) {
  const { user } = useAuth()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState({ name: '', head_user_id: '' as string | number, parent_department_id: '' as string | number, status: 'active' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openCreate = () => { setEditing(null); setForm({ name: '', head_user_id: '', parent_department_id: '', status: 'active' }); setError(null); setModal(true) }
  const openEdit = (d: Department) => {
    setEditing(d)
    setForm({
      name: d.name,
      head_user_id: d.head_user_id ?? '',
      parent_department_id: d.parent_department_id ?? '',
      status: (d.status as 'active' | 'inactive') === 'inactive' ? 'inactive' : 'active',
    })
    setError(null)
    setModal(true)
  }

  const save = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name,
      head_user_id: form.head_user_id === '' ? null : Number(form.head_user_id),
      parent_department_id: form.parent_department_id === '' ? null : Number(form.parent_department_id),
      status: form.status,
    }
    try {
      if (editing) {
        await api.updateDepartment(editing.id, payload)
      } else {
        await api.createDepartment(payload)
      }
      setModal(false)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save department')
    } finally {
      setSaving(false)
    }
  }

  const heads = users.filter((u) => u.role === 'department_head' || u.role === 'admin')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">{departments.length} department{departments.length !== 1 ? 's' : ''}</p>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> New Department</button>
      </div>

      {departments.length === 0 ? (
        <EmptyState icon={<Building2 size={40} />} title="No departments yet" subtitle="Create your first department to get started." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => {
            const parent = departments.find((p) => p.id === d.parent_department_id)
            return (
              <div key={d.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{d.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-600"><span className="text-slate-400">Head:</span><span>{d.head_name ?? 'Not assigned'}</span></div>
                  {parent && <div className="flex items-center gap-2 text-slate-600"><span className="text-slate-400">Parent:</span><span>{parent.name}</span></div>}
                  {typeof d.member_count === 'number' && <div className="flex items-center gap-2 text-slate-600"><span className="text-slate-400">Members:</span><span>{d.member_count}</span></div>}
                  <div><span className={`badge ${d.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-500'}`}>{d.status}</span></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Department' : 'New Department'}>
        <div className="space-y-4">
          <div><label className="label">Department Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department Head</label>
              <select className="input" value={form.head_user_id} onChange={(e) => setForm({ ...form, head_user_id: e.target.value })}>
                <option value="">None</option>
                {heads.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Parent Department</label>
              <select className="input" value={form.parent_department_id} onChange={(e) => setForm({ ...form, parent_department_id: e.target.value })}>
                <option value="">None</option>
                {departments.filter((d) => d.id !== editing?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {error && <p className="text-sm text-error-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={!form.name.trim() || saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function CategoriesTab({ categories, onChanged }: { categories: AssetCategory[]; onChanged: () => void }) {
  const { user } = useAuth()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<AssetCategory | null>(null)
  const [form, setForm] = useState({ name: '', warrantyPeriod: '' })
  const [deleteTarget, setDeleteTarget] = useState<AssetCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseCustomFields = (cf: string | Record<string, unknown> | undefined): Record<string, unknown> => {
    if (!cf) return {}
    if (typeof cf === 'string') {
      try { return JSON.parse(cf) as Record<string, unknown> } catch { return {} }
    }
    return cf
  }

  const openCreate = () => { setEditing(null); setForm({ name: '', warrantyPeriod: '' }); setError(null); setModal(true) }
  const openEdit = (c: AssetCategory) => {
    setEditing(c)
    const cf = parseCustomFields(c.custom_fields)
    setForm({ name: c.name, warrantyPeriod: (cf.warranty_period as string) ?? '' })
    setError(null)
    setModal(true)
  }

  const save = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    const customFields = form.warrantyPeriod ? { warranty_period: form.warrantyPeriod } : {}
    try {
      if (editing) {
        await api.updateCategory(editing.id, { name: form.name, custom_fields: customFields })
      } else {
        await api.createCategory({ name: form.name, custom_fields: customFields })
      }
      setModal(false)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!user || !deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await api.deleteCategory(deleteTarget.id)
      setDeleteTarget(null)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete category')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</p>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> New Category</button>
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<Tag size={40} />} title="No categories yet" subtitle="Create categories like Electronics, Furniture, or Vehicles." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((c) => {
            const cf = parseCustomFields(c.custom_fields)
            return (
              <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center"><Tag size={20} /></div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={16} /></button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900">{c.name}</h3>
                {cf.warranty_period ? <p className="text-xs text-slate-400 mt-2">Warranty: {String(cf.warranty_period)}</p> : null}
                {typeof c.asset_count === 'number' ? <p className="text-xs text-slate-400 mt-1">{c.asset_count} asset{c.asset_count !== 1 ? 's' : ''}</p> : null}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <div className="space-y-4">
          <div><label className="label">Category Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electronics" /></div>
          <div><label className="label">Warranty Period (optional)</label><input className="input" value={form.warrantyPeriod} onChange={(e) => setForm({ ...form, warrantyPeriod: e.target.value })} placeholder="e.g. 12 months" /></div>
          {error && <p className="text-sm text-error-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={!form.name.trim() || saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={del} title="Delete category" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel={deleting ? 'Deleting…' : 'Delete'} />
    </div>
  )
}

function EmployeesTab({ users, departments, onChanged }: { users: User[]; departments: Department[]; onChanged: () => void }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<{ role: Role }>({ role: 'employee' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const openEdit = (u: User) => { setEditing(u); setForm({ role: u.role }); setError(null) }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('assetflow_token')
      const res = await fetch('/api/auth/users/' + editing.id + '/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token ?? '') },
        body: JSON.stringify({ role: form.role }),
      })
      if (!res.ok) {
        let msg = `Request failed (${res.status})`
        try { const data = await res.json(); if (data.error) msg = data.error } catch { /* ignore */ }
        throw new Error(msg)
      }
      setEditing(null)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  const deptName = (id: number | null) => departments.find((d) => d.id === id)?.name ?? '—'
  const roleColors: Record<Role, string> = { admin: 'bg-primary-100 text-primary-700', asset_manager: 'bg-accent-100 text-accent-700', department_head: 'bg-success-100 text-success-700', employee: 'bg-slate-100 text-slate-600' }
  const roleLabels: Record<Role, string> = { admin: 'Admin', asset_manager: 'Asset Manager', department_head: 'Dept Head', employee: 'Employee' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <input className="input max-w-xs" placeholder="Search employees…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <p className="text-sm text-slate-600">{users.length} employee{users.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Department</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">{u.name.charAt(0).toUpperCase()}</div>
                      <span className="text-sm font-medium text-slate-900">{u.name || '(no name)'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{deptName(u.department_id)}</td>
                  <td className="px-4 py-3"><span className={`badge ${roleColors[u.role]}`}>{roleLabels[u.role]}</span></td>
                  <td className="px-4 py-3"><span className={`badge ${u.status === 'active' ? 'bg-success-100 text-success-700' : 'bg-slate-100 text-slate-500'}`}>{u.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== user?.id && <button onClick={() => openEdit(u)} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">Manage <ChevronRight size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Manage Employee">
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">{editing.name.charAt(0).toUpperCase()}</div>
              <div><p className="font-medium text-slate-900">{editing.name}</p><p className="text-sm text-slate-500">{editing.email}</p></div>
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="employee">Employee</option>
                <option value="department_head">Department Head</option>
                <option value="asset_manager">Asset Manager</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Promote employees to Department Head or Asset Manager here.</p>
            </div>
            {error && <p className="text-sm text-error-600">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
