import { query } from '../config/db.js'
import { logActivity } from '../utils/logActivity.js'

export async function listMaintenance(req, res) {
  const { status, asset_id } = req.query
  let sql = 'SELECT * FROM maintenance_requests'
  const params = []
  const conditions = []
  if (status) { conditions.push('status = ?'); params.push(status) }
  if (asset_id) { conditions.push('asset_id = ?'); params.push(asset_id) }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY id DESC'

  const maintenance = await query(sql, params)
  const assets = await query('SELECT * FROM assets')
  const users = await query('SELECT * FROM users')

  const result = maintenance.map((m) => ({
    ...m,
    asset_name: assets.find((a) => a.id === m.asset_id)?.name ?? null,
    asset_tag: assets.find((a) => a.id === m.asset_id)?.tag ?? null,
    raised_by_name: users.find((u) => u.id === m.raised_by)?.name ?? null,
    approved_by_name: users.find((u) => u.id === m.approved_by)?.name ?? null,
  }))
  res.json({ maintenance: result })
}

export async function createMaintenance(req, res) {
  const { asset_id, issue_description, priority, photo_url } = req.body
  if (!asset_id || !issue_description) {
    return res.status(400).json({ error: 'Asset and issue description required' })
  }
  const result = await query(
    "INSERT INTO maintenance_requests (asset_id, raised_by, issue_description, priority, photo_url, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    [asset_id, req.user.id, issue_description, priority || 'medium', photo_url || null]
  )
  const id = result.insertId || result[0]?.id
  await query("UPDATE assets SET status = 'under_maintenance' WHERE id = ?", [asset_id])
  await logActivity(req.user.id, 'Raised maintenance request', 'asset', asset_id, { priority })
  res.status(201).json({ id })
}

export async function approveMaintenance(req, res) {
  const { id } = req.params
  const { technician_name } = req.body
  await query("UPDATE maintenance_requests SET status = 'approved', approved_by = ?, approved_at = NOW(), technician_name = ? WHERE id = ?",
    [req.user.id, technician_name || null, id])
  await logActivity(req.user.id, 'Approved maintenance', 'maintenance', parseInt(id))
  res.json({ success: true })
}

export async function resolveMaintenance(req, res) {
  const { id } = req.params
  const { resolution_notes } = req.body
  const rows = await query('SELECT * FROM maintenance_requests WHERE id = ?', [id])
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
  await query("UPDATE maintenance_requests SET status = 'resolved', resolution_notes = ?, resolved_at = NOW() WHERE id = ?",
    [resolution_notes || null, id])
  await query("UPDATE assets SET status = 'available' WHERE id = ?", [rows[0].asset_id])
  await logActivity(req.user.id, 'Resolved maintenance', 'maintenance', parseInt(id))
  res.json({ success: true })
}
