import { query } from '../config/db.js'
import { logActivity } from '../utils/logActivity.js'

export async function listBookings(req, res) {
  const { asset_id, user_id, status } = req.query
  let sql = 'SELECT * FROM bookings'
  const params = []
  const conditions = []
  if (asset_id) { conditions.push('asset_id = ?'); params.push(asset_id) }
  if (user_id) { conditions.push('booked_by = ?'); params.push(user_id) }
  if (status) { conditions.push('status = ?'); params.push(status) }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY start_time DESC'

  const bookings = await query(sql, params)
  const assets = await query('SELECT * FROM assets')
  const users = await query('SELECT * FROM users')

  const result = bookings.map((b) => ({
    ...b,
    asset_name: assets.find((a) => a.id === b.asset_id)?.name ?? null,
    asset_tag: assets.find((a) => a.id === b.asset_id)?.tag ?? null,
    user_name: users.find((u) => u.id === b.booked_by)?.name ?? null,
  }))
  res.json({ bookings: result })
}

export async function createBooking(req, res) {
  try {
    const { asset_id, start_time, end_time, purpose } = req.body
    if (!asset_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Asset, start and end time required' })
    }

    const conflicts = await query(
      "SELECT * FROM bookings WHERE asset_id = ? AND status != 'cancelled'",
      [asset_id]
    )
    const start = new Date(start_time)
    const end = new Date(end_time)
    const hasConflict = conflicts.some((b) => {
      const bStart = new Date(b.start_time)
      const bEnd = new Date(b.end_time)
      return start < bEnd && end > bStart
    })
    if (hasConflict) {
      return res.status(409).json({ error: 'Time slot unavailable — overlaps with existing booking' })
    }

    const result = await query(
      "INSERT INTO bookings (asset_id, booked_by, start_time, end_time, purpose, status) VALUES (?, ?, ?, ?, ?, 'upcoming')",
      [asset_id, req.user.id, start_time, end_time, purpose || null]
    )
    const id = result.insertId || result[0]?.id
    await logActivity(req.user.id, 'Booked resource', 'asset', asset_id, { start_time, end_time })
    res.status(201).json({ id })
  } catch (err) {
    console.error('[createBooking]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function cancelBooking(req, res) {
  const { id } = req.params
  await query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id])
  await logActivity(req.user.id, 'Cancelled booking', 'booking', parseInt(id))
  res.json({ success: true })
}
