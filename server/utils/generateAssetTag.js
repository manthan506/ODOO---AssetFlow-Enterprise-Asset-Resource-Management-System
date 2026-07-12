import { query } from '../config/db.js'

export async function generateAssetTag() {
  const rows = await query('SELECT COUNT(*) as count FROM assets')
  const count = rows[0]?.count || 0
  return 'AF-' + String(count + 1).padStart(4, '0')
}
