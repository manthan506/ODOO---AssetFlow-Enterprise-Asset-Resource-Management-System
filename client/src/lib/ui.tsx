import { ReactNode } from 'react'
import { X } from 'lucide-react'

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  const styles: Record<string, string> = {
    available: 'bg-success-100 text-success-700',
    allocated: 'bg-primary-100 text-primary-700',
    reserved: 'bg-accent-100 text-accent-700',
    under_maintenance: 'bg-warning-100 text-warning-700',
    'under maintenance': 'bg-warning-100 text-warning-700',
    lost: 'bg-error-100 text-error-700',
    retired: 'bg-slate-100 text-slate-600',
    disposed: 'bg-slate-200 text-slate-500',
    active: 'bg-primary-100 text-primary-700',
    returned: 'bg-slate-100 text-slate-600',
    transferred: 'bg-accent-100 text-accent-700',
    pending: 'bg-warning-100 text-warning-700',
    approved: 'bg-primary-100 text-primary-700',
    resolved: 'bg-success-100 text-success-700',
    in_progress: 'bg-accent-100 text-accent-700',
    'in progress': 'bg-accent-100 text-accent-700',
    upcoming: 'bg-accent-100 text-accent-700',
    ongoing: 'bg-primary-100 text-primary-700',
    completed: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-error-100 text-error-700',
    requested: 'bg-warning-100 text-warning-700',
    rejected: 'bg-error-100 text-error-700',
    verified: 'bg-success-100 text-success-700',
    discrepancy: 'bg-error-100 text-error-700',
  }
  const label = s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[s] || 'bg-slate-100 text-slate-600'}`}>{label}</span>
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase()
  const styles: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-accent-100 text-accent-700',
    high: 'bg-warning-100 text-warning-700',
    critical: 'bg-error-100 text-error-700',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[p] || styles.medium}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
}

export function Modal({ open, onClose, title, children, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-slide-up`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-300 mb-3">{icon}</div>
      <p className="text-slate-600 font-medium">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm' }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 mb-4">{message}</p>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
