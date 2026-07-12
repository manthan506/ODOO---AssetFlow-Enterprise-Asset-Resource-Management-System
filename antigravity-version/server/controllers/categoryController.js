import { query } from '../config/db.js'
import { logActivity } from '../utils/logActivity.js'

export async function listCategories(req, res) {
  const categories = await query('SELECT * FROM asset_categories ORDER BY id')
  const assets = await query('SELECT * FROM assets')
  const result = categories.map((c) => ({
    ...c,
    asset_count: assets.filter((a) => a.category_id === c.id).length,
  }))
  res.json({ categories: result })
}

export async function createCategory(req, res) {
  const { name, custom_fields } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const result = await query(
    'INSERT INTO asset_categories (name, custom_fields) VALUES (?, ?)',
    [name, custom_fields ? JSON.stringify(custom_fields) : '{}']
  )
  const id = result.insertId || result[0]?.id
  await logActivity(req.user.id, 'Created category', 'category', id, { name })
  res.status(201).json({ id })
}

export async function updateCategory(req, res) {
  const { id } = req.params
  const { name, custom_fields } = req.body
  await query('UPDATE asset_categories SET name = ?, custom_fields = ? WHERE id = ?',
    [name, custom_fields ? JSON.stringify(custom_fields) : '{}', id])
  res.json({ success: true })
}

export async function deleteCategory(req, res) {
  const { id } = req.params
  const assets = await query('SELECT COUNT(*) as count FROM assets WHERE category_id = ?', [id])
  if (assets[0]?.count > 0) return res.status(409).json({ error: 'Category has assets' })
  await query('DELETE FROM asset_categories WHERE id = ?', [id])
  res.json({ success: true })
}
