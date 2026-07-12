import { query } from '../config/db.js'
import { generateAssetTag } from '../utils/generateAssetTag.js'
import { logActivity } from '../utils/logActivity.js'

export async function listAssets(req, res) {
  const { status, category_id, search } = req.query
  let sql = 'SELECT * FROM assets'
  const params = []
  const conditions = []
  if (status) { conditions.push('status = ?'); params.push(status) }
  if (category_id) { conditions.push('category_id = ?'); params.push(category_id) }
  if (search) {
    conditions.push('(name LIKE ? OR tag LIKE ? OR serial_number LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY id DESC'

  const assets = await query(sql, params)
  const categories = await query('SELECT * FROM asset_categories')
  const departments = await query('SELECT * FROM departments')
  const activeAllocs = await query("SELECT * FROM allocations WHERE status = 'active'")
  const users = await query('SELECT * FROM users')

  const result = assets.map((a) => ({
    ...a,
    category_name: categories.find((c) => c.id === a.category_id)?.name ?? null,
    department_name: departments.find((d) => d.id === a.department_id)?.name ?? null,
    allocated_user_name: (() => {
      const alloc = activeAllocs.find((al) => al.asset_id === a.id)
      if (!alloc) return null
      return users.find((u) => u.id === alloc.user_id)?.name ?? null
    })(),
  }))
  res.json({ assets: result })
}

export async function getAsset(req, res) {
  const { id } = req.params
  const assets = await query('SELECT * FROM assets WHERE id = ?', [id])
  if (assets.length === 0) return res.status(404).json({ error: 'Asset not found' })
  const categories = await query('SELECT * FROM asset_categories')
  const departments = await query('SELECT * FROM departments')
  const asset = assets[0]
  asset.category_name = categories.find((c) => c.id === asset.category_id)?.name ?? null
  asset.department_name = departments.find((d) => d.id === asset.department_id)?.name ?? null
  res.json({ asset })
}

export async function createAsset(req, res) {
  const { name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, is_bookable, department_id, photo_url } = req.body
  if (!name || !category_id) return res.status(400).json({ error: 'Name and category required' })
  const tag = await generateAssetTag()
  const result = await query(
    `INSERT INTO assets (tag, name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, photo_url, is_bookable, status, department_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?)`,
    [tag, name, category_id, serial_number || null, acquisition_date || null, acquisition_cost || 0, condition || 'good', location || null, photo_url || null, is_bookable || false, department_id || null, req.user.id]
  )
  const id = result.insertId || result[0]?.id
  await logActivity(req.user.id, 'Registered asset', 'asset', id, { name, tag })
  res.status(201).json({ id, tag })
}

export async function updateAsset(req, res) {
  const { id } = req.params
  const { name, category_id, serial_number, acquisition_date, acquisition_cost, condition, location, is_bookable, department_id, photo_url, status } = req.body
  await query(
    `UPDATE assets SET name = ?, category_id = ?, serial_number = ?, acquisition_date = ?, acquisition_cost = ?, condition = ?, location = ?, is_bookable = ?, department_id = ?, photo_url = ?, status = ? WHERE id = ?`,
    [name, category_id, serial_number || null, acquisition_date || null, acquisition_cost || 0, condition || 'good', location || null, is_bookable || false, department_id || null, photo_url || null, status || 'available', id]
  )
  await logActivity(req.user.id, 'Updated asset', 'asset', parseInt(id))
  res.json({ success: true })
}

export async function deleteAsset(req, res) {
  const { id } = req.params
  await query('UPDATE assets SET status = ? WHERE id = ?', ['retired', id])
  await logActivity(req.user.id, 'Retired asset', 'asset', parseInt(id))
  res.json({ success: true })
}
