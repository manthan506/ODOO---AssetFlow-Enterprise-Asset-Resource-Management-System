import { query } from '../config/db.js'

export async function listDepartments(req, res) {
  const departments = await query('SELECT * FROM departments ORDER BY id')
  const users = await query('SELECT * FROM users')
  const result = departments.map((d) => ({
    ...d,
    head_name: users.find((u) => u.id === d.head_user_id)?.name ?? null,
    member_count: users.filter((u) => u.department_id === d.id).length,
  }))
  res.json({ departments: result })
}

export async function createDepartment(req, res) {
  const { name, head_user_id, parent_department_id } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })
  const result = await query(
    "INSERT INTO departments (name, head_user_id, parent_department_id, status) VALUES (?, ?, ?, 'active')",
    [name, head_user_id || null, parent_department_id || null]
  )
  const id = result.insertId || result[0]?.id
  await (await import('../utils/logActivity.js')).logActivity(req.user.id, 'Created department', 'department', id, { name })
  res.status(201).json({ id })
}

export async function updateDepartment(req, res) {
  const { id } = req.params
  const { name, head_user_id, parent_department_id, status } = req.body
  await query('UPDATE departments SET name = ?, head_user_id = ?, parent_department_id = ?, status = ? WHERE id = ?',
    [name, head_user_id || null, parent_department_id || null, status || 'active', id])
  await (await import('../utils/logActivity.js')).logActivity(req.user.id, 'Updated department', 'department', parseInt(id))
  res.json({ success: true })
}
