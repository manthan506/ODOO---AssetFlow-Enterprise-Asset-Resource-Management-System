import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Clock, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import type { Asset, Booking } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Modal, StatusBadge, EmptyState } from '../lib/ui'

export function Bookings() {
  const { user } = useAuth()
  const [bookableAssets, setBookableAssets] = useState<Asset[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingModal, setBookingModal] = useState(false)
  const [viewDate, setViewDate] = useState(new Date())

  const load = useCallback(async () => {
    try {
      const { assets } = await api.listAssets()
      const bookable = assets.filter((a) => a.is_bookable).sort((a, b) => a.name.localeCompare(b.name))
      setBookableAssets(bookable)
      const id = selectedAssetId || bookable[0]?.id || ''
      if (!selectedAssetId && id) setSelectedAssetId(id)

      if (id) {
        const { bookings: bkgs } = await api.listBookings({ asset_id: id as number })
        bkgs.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        setBookings(bkgs)
      } else {
        setBookings([])
      }
    } catch (err) {
      console.error('Failed to load bookings:', err)
    }
  }, [selectedAssetId])

  useEffect(() => { load() }, [load])

  const selectedAsset = bookableAssets.find((a) => a.id === selectedAssetId)
  const dateStr = viewDate.toISOString().split('T')[0]
  const dayBookings = bookings.filter((b) => b.start_time.startsWith(dateStr))

  const cancelBooking = async (b: Booking) => {
    try {
      await api.cancelBooking(b.id)
      load()
    } catch (err) {
      console.error('Failed to cancel booking:', err)
    }
  }

  if (bookableAssets.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Resource Bookings</h1>
        <EmptyState icon={<Calendar size={40} />} title="No bookable resources" subtitle="Mark assets as 'Shared / Bookable' in the Assets page to enable booking." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resource Bookings</h1>
          <p className="text-sm text-slate-500 mt-1">Book shared resources by time slot with automatic overlap validation.</p>
        </div>
        <button className="btn-primary" onClick={() => setBookingModal(true)}><Plus size={16} /> New Booking</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-wrap gap-2">
            <select className="input max-w-xs" value={selectedAssetId} onChange={(e) => setSelectedAssetId(Number(e.target.value))}>
              {bookableAssets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
            </select>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewDate(new Date(viewDate.getTime() - 86400000))} className="btn-ghost p-2">&lt;</button>
              <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">{viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              <button onClick={() => setViewDate(new Date(viewDate.getTime() + 86400000))} className="btn-ghost p-2">&gt;</button>
              <button onClick={() => setViewDate(new Date())} className="btn-secondary py-1.5 text-xs">Today</button>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-1">
              {Array.from({ length: 12 }, (_, i) => i + 7).map((hour) => {
                const slotBookings = dayBookings.filter((b) => {
                  const start = new Date(b.start_time)
                  return start.getHours() === hour
                })
                const isPast = viewDate.toDateString() === new Date().toDateString() && hour < new Date().getHours()
                return (
                  <div key={hour} className={`flex items-center gap-3 py-1 ${isPast ? 'opacity-40' : ''}`}>
                    <span className="text-xs text-slate-400 w-12 text-right">{hour}:00</span>
                    <div className="flex-1 min-h-[32px]">
                      {slotBookings.map((b) => {
                        const start = new Date(b.start_time)
                        const end = new Date(b.end_time)
                        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                        return (
                          <div key={b.id} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between mb-1 ${b.status === 'cancelled' ? 'bg-error-50 text-error-600 line-through' : b.status === 'ongoing' ? 'bg-primary-100 text-primary-700' : b.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-accent-100 text-accent-700'}`} style={{ height: `${durationHours * 36}px` }}>
                            <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-xs opacity-75">{b.user_name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-slate-200"><h2 className="font-semibold text-slate-900">All Bookings</h2></div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {bookings.length === 0 ? <p className="text-sm text-slate-400 py-8 text-center">No bookings yet.</p> : (
              <div className="space-y-2">
                {bookings.slice(0, 20).map((b) => (
                  <div key={b.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{new Date(b.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-sm text-slate-600">{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {b.purpose && <p className="text-xs text-slate-400 mt-1">{b.purpose}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">Booked by {b.user_name}</p>
                    {b.booked_by === user?.id && b.status !== 'cancelled' && b.status !== 'completed' && <button onClick={() => cancelBooking(b)} className="text-xs text-error-600 font-medium hover:underline mt-1">Cancel</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {bookingModal && selectedAsset && <BookingModal asset={selectedAsset} onClose={() => setBookingModal(false)} onSaved={load} />}
    </div>
  )
}

function BookingModal({ asset, onClose, onSaved }: { asset: Asset; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    setError(null)
    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)
    if (end <= start) { setError('End time must be after start time'); setSaving(false); return }
    try {
      await api.createBooking({
        asset_id: asset.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        purpose: purpose || undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Book ${asset.name}`} size="md">
      <div className="space-y-4">
        {error && <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-3 py-2 flex items-start gap-2"><AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
        <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Start Time</label><input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div><label className="label">End Time</label><input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <div><label className="label">Purpose (optional)</label><input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Team meeting" /></div>
        <div className="bg-accent-50 rounded-lg p-3 text-xs text-accent-700 flex items-center gap-2"><Clock size={16} /> Overlap validation is automatic — the system rejects bookings that conflict with existing ones.</div>
        <div className="flex justify-end gap-3 pt-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Booking…' : 'Book Resource'}</button></div>
      </div>
    </Modal>
  )
}
