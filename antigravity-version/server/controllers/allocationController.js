import { query } from '../config/db.js'
import { logActivity } from '../utils/logActivity.js'

export async function listAllocations(req, res) {
  const { status, user_id } = req.query
  let sql = 'SELECT * FROM allocations'
  const params = []
  const conditions = []
  if (status) { conditions.push('status = ?'); params.push(status) }
  if (user_id) { conditions.push('user_id = ?'); params.push(user_id) }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY id DESC'

  const allocations = await query(sql, params)
  const assets = await query('SELECT * FROM assets')
  const users = await query('SELECT * FROM users')
  const departments = await query('SELECT * FROM departments')

  const result = allocations.map((a) => ({
    ...a,
    asset_name: assets.find((x) => x.id === a.asset_id)?.name ?? null,
    asset_tag: assets.find((x) => x.id === a.asset_id)?.tag ?? null,
    user_name: users.find((u) => u.id === a.user_id)?.name ?? null,
    allocated_by_name: users.find((u) => u.id === a.allocated_by)?.name ?? null,
    department_name: departments.find((d) => d.id === a.department_id)?.name ?? null,
  }))
  res.json({ allocations: result })
}

export async function createAllocation(req, res) {
  try {
    const { asset_id, user_id, department_id, expected_return_date } = req.body
    if (!asset_id || (!user_id && !department_id)) {
      return res.status(400).json({ error: 'Asset and user/department required' })
    }

    const existing = await query(
      "SELECT * FROM allocations WHERE asset_id = ? AND status = 'active'",
      [asset_id]
    )
    if (existing.length > 0) {
      const users = await query('SELECT * FROM users')
      const holder = users.find((u) => u.id === existing[0].user_id)
      return res.status(409).json({
        error: `Already allocated to ${holder?.name || 'a department'}`,
        suggestTransfer: true,
      })
    }

    const result = await query(
      "INSERT INTO allocations (asset_id, user_id, department_id, allocated_by, allocated_date, expected_return_date, status) VALUES (?, ?, ?, ?, NOW(), ?, 'active')",
      [asset_id, user_id || null, department_id || null, req.user.id, expected_return_date || null]
    )
    const id = result.insertId || result[0]?.id
    await query("UPDATE assets SET status = 'allocated' WHERE id = ?", [asset_id])
    await logActivity(req.user.id, 'Allocated asset', 'asset', asset_id, { to: user_id || department_id })

    if (user_id) {
      const assetRows = await query('SELECT * FROM assets WHERE id = ?', [asset_id])
      if (assetRows.length > 0) {
        await query(
          'INSERT INTO notifications (user_id, type, message, related_id, related_type, is_read) VALUES (?, ?, ?, ?, ?, ?)',
          [user_id, 'asset_assigned', `Asset ${assetRows[0].name} (${assetRows[0].tag}) has been assigned to you.`, asset_id, 'asset', false]
        )
      }
    }
    res.status(201).json({ id })
  } catch (err) {
    console.error('[createAllocation]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function returnAllocation(req, res) {
  const { id } = req.params
  const { return_condition_notes } = req.body
  const rows = await query('SELECT * FROM allocations WHERE id = ?', [id])
  if (rows.length === 0) return res.status(404).json({ error: 'Allocation not found' })
  const alloc = rows[0]
  await query(
    "UPDATE allocations SET status = 'returned', actual_return_date = NOW(), return_condition_notes = ? WHERE id = ?",
    [return_condition_notes || null, id]
  )
  await query("UPDATE assets SET status = 'available' WHERE id = ?", [alloc.asset_id])
  await logActivity(req.user.id, 'Returned asset', 'asset', alloc.asset_id)
  res.json({ success: true })
}

export async function listTransferRequests(req, res) {
  const transfers = await query('SELECT * FROM transfer_requests ORDER BY id DESC')
  const assets = await query('SELECT * FROM assets')
  const users = await query('SELECT * FROM users')

  const result = transfers.map((t) => ({
    ...t,
    asset_name: assets.find((a) => a.id === t.asset_id)?.name ?? null,
    asset_tag: assets.find((a) => a.id === t.asset_id)?.tag ?? null,
    from_user_name: users.find((u) => u.id === t.from_user_id)?.name ?? null,
    to_user_name: users.find((u) => u.id === t.to_user_id)?.name ?? null,
    requested_by_name: users.find((u) => u.id === t.requested_by)?.name ?? null,
  }))
  res.json({ transfers: result })
}

export async function createTransferRequest(req, res) {
  const { asset_id, from_user_id, to_user_id, reason } = req.body
  const result = await query(
    "INSERT INTO transfer_requests (asset_id, from_user_id, to_user_id, requested_by, reason, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    [asset_id, from_user_id || null, to_user_id || null, req.user.id, reason || null]
  )
  const id = result.insertId || result[0]?.id
  await logActivity(req.user.id, 'Requested transfer', 'asset', asset_id, { to: to_user_id })
  res.status(201).json({ id })
}

export async function approveTransfer(req, res) {
  const { id } = req.params
  const rows = await query('SELECT * FROM transfer_requests WHERE id = ?', [id])
  if (rows.length === 0) return res.status(404).json({ error: 'Transfer not found' })
  const tr = rows[0]
  await query("UPDATE transfer_requests SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?",
    [req.user.id, id])
  await query("UPDATE allocations SET status = 'transferred', actual_return_date = NOW() WHERE asset_id = ? AND user_id = ? AND status = 'active'",
    [tr.asset_id, tr.from_user_id])
  await query(
    "INSERT INTO allocations (asset_id, user_id, allocated_by, allocated_date, status) VALUES (?, ?, ?, NOW(), 'active')",
    [tr.asset_id, tr.to_user_id, req.user.id]
  )
  await logActivity(req.user.id, 'Approved transfer', 'asset', tr.asset_id)
  res.json({ success: true })
}
