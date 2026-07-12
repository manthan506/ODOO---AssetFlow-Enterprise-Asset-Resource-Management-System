import { query } from '../config/db.js'

export async function logActivity(userId, action, entityType, entityId, details = null) {
  try {
    await query(
      'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [userId, action, entityType, entityId, details ? JSON.stringify(details) : null]
    )
  } catch (err) {
    console.error('[logActivity] Failed:', err.message)
  }
}
