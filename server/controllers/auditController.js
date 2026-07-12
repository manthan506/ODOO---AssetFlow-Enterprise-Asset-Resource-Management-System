import { query } from '../config/db.js'
import { logActivity } from '../utils/logActivity.js'

export async function listAuditCycles(req, res) {
  const cycles = await query('SELECT * FROM audit_cycles ORDER BY id DESC')
  const users = await query('SELECT * FROM users')
  const items = await query('SELECT * FROM audit_items')

  const result = cycles.map((c) => ({
    ...c,
    created_by_name: users.find((u) => u.id === c.created_by)?.name ?? null,
    total_items: items.filter((i) => i.cycle_id === c.id).length,
    discrepancy_count: items.filter((i) => i.cycle_id === c.id && i.status === 'discrepancy').length,
  }))
  res.json({ cycles: result })
}

export async function createAuditCycle(req, res) {
  const { title, scope, auditor_ids, asset_ids } = req.body
  if (!title) return res.status(400).json({ error: 'Title required' })
  const result = await query(
    "INSERT INTO audit_cycles (title, scope, created_by, status, started_at) VALUES (?, ?, ?, 'in_progress', NOW())",
    [title, scope || 'all', req.user.id]
  )
  const cycleId = result.insertId || result[0]?.id

  if (auditor_ids && auditor_ids.length > 0) {
    for (const auditorId of auditor_ids) {
      await query('INSERT INTO audit_cycle_auditors (cycle_id, user_id) VALUES (?, ?)', [cycleId, auditorId])
    }
  }

  let assetRows
  if (asset_ids && asset_ids.length > 0) {
    const placeholders = asset_ids.map(() => '?').join(',')
    assetRows = await query(`SELECT * FROM assets WHERE id IN (${placeholders})`, asset_ids)
  } else {
    assetRows = await query("SELECT * FROM assets WHERE status != 'retired'")
  }
  for (const asset of assetRows) {
    await query("INSERT INTO audit_items (cycle_id, asset_id, expected_status, status) VALUES (?, ?, 'available', 'pending')",
      [cycleId, asset.id])
  }

  await logActivity(req.user.id, 'Created audit cycle', 'audit_cycle', cycleId, { title })
  res.status(201).json({ id: cycleId })
}

export async function getAuditCycle(req, res) {
  const { id } = req.params
  const cycles = await query('SELECT * FROM audit_cycles WHERE id = ?', [id])
  if (cycles.length === 0) return res.status(404).json({ error: 'Cycle not found' })
  const items = await query('SELECT * FROM audit_items WHERE cycle_id = ? ORDER BY id', [id])
  const assets = await query('SELECT * FROM assets')

  const result = items.map((item) => ({
    ...item,
    asset_name: assets.find((a) => a.id === item.asset_id)?.name ?? null,
    asset_tag: assets.find((a) => a.id === item.asset_id)?.tag ?? null,
    asset_current_status: assets.find((a) => a.id === item.asset_id)?.status ?? null,
  }))
  res.json({ cycle: cycles[0], items: result })
}

export async function updateAuditItem(req, res) {
  const { id } = req.params
  const { status, discrepancy_notes } = req.body
  await query('UPDATE audit_items SET status = ?, discrepancy_notes = ?, checked_at = NOW(), checked_by = ? WHERE id = ?',
    [status || 'verified', discrepancy_notes || null, req.user.id, id])
  res.json({ success: true })
}

export async function closeAuditCycle(req, res) {
  const { id } = req.params
  await query("UPDATE audit_cycles SET status = 'completed', completed_at = NOW() WHERE id = ?", [id])
  await logActivity(req.user.id, 'Closed audit cycle', 'audit_cycle', parseInt(id))
  res.json({ success: true })
}
