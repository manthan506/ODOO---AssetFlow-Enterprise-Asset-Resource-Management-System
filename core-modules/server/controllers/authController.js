import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/db.js'
import { logActivity } from '../utils/logActivity.js'

const JWT_SECRET = process.env.JWT_SECRET || 'assetflow_jwt_secret_2024'
const JWT_EXPIRES = '7d'

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, department_id: user.department_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

export async function signup(req, res) {
  try {
    const { name, email, password, role, department_id } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const validRoles = ['admin', 'asset_manager', 'department_head', 'employee']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const existing = await query('SELECT * FROM users WHERE email = ?', [email])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (name, email, password, role, department_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashed, role, department_id || null, 'active']
    )
    const userId = result.insertId || result[0]?.id
    const user = { id: userId, name, email, role, department_id: department_id || null }
    const token = sign(user)
    await logActivity(userId, 'Signed up', 'user', userId, { role })
    res.status(201).json({ token, user })
  } catch (err) {
    console.error('[signup]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const users = await query('SELECT * FROM users WHERE email = ?', [email])
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const user = users[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = sign(user)
    await logActivity(user.id, 'Logged in', 'user', user.id)
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department_id: user.department_id },
    })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function me(req, res) {
  const users = await query('SELECT id, name, email, role, department_id, status FROM users WHERE id = ?', [req.user.id])
  if (users.length === 0) return res.status(404).json({ error: 'User not found' })
  res.json({ user: users[0] })
}

export async function listUsers(req, res) {
  const users = await query('SELECT id, name, email, role, department_id, status FROM users ORDER BY id')
  res.json({ users })
}

export async function updateRole(req, res) {
  const { id } = req.params
  const { role } = req.body
  const validRoles = ['admin', 'asset_manager', 'department_head', 'employee']
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' })
  await query('UPDATE users SET role = ? WHERE id = ?', [role, id])
  await logActivity(req.user.id, 'Updated user role', 'user', id, { role })
  res.json({ success: true })
}
