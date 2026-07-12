import { query } from '../config/db.js'

export async function listNotifications(req, res) {
  const rows = await query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC',
    [req.user.id]
  )
  res.json({ notifications: rows })
}

export async function markRead(req, res) {
  const { id } = req.params
  await query('UPDATE notifications SET is_read = ? WHERE id = ? AND user_id = ?', [true, id, req.user.id])
  res.json({ success: true })
}

export async function markAllRead(req, res) {
  await query('UPDATE notifications SET is_read = ? WHERE user_id = ?', [true, req.user.id])
  res.json({ success: true })
}

export async function deleteNotification(req, res) {
  const { id } = req.params
  await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id])
  res.json({ success: true })
}
