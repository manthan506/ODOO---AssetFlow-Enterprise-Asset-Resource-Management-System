import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

let pool = null
let useInMemory = false

// ============================================================
// In-memory store (fallback when MySQL server is not available)
// ============================================================
const memDB = {
  tables: {
    departments: [],
    users: [],
    asset_categories: [],
    assets: [],
    allocations: [],
    transfer_requests: [],
    bookings: [],
    maintenance_requests: [],
    audit_cycles: [],
    audit_cycle_auditors: [],
    audit_items: [],
    notifications: [],
    activity_logs: [],
  },
  autoIncrement: {},
  seq: {},
}

function nextId(table) {
  if (!memDB.autoIncrement[table]) memDB.autoIncrement[table] = 1
  return memDB.autoIncrement[table]++
}

function nextTag() {
  if (!memDB.seq.asset_tag) memDB.seq.asset_tag = 1
  const n = memDB.seq.asset_tag++
  return 'AF-' + String(n).padStart(4, '0')
}

// Convert snake_case keys to camelCase for the API layer
function toCamel(row) {
  if (!row) return null
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

function toCamelArray(rows) {
  return rows.map(toCamel)
}

// ============================================================
// Query executor — tries MySQL first, falls back to in-memory
// ============================================================
export async function query(sql, params = []) {
  if (useInMemory) {
    return memQuery(sql, params)
  }
  try {
    if (!pool) {
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'assetflow',
        waitForConnections: true,
        connectionLimit: 10,
      })
    }
    const [rows] = await pool.execute(sql, params)
    return rows
  } catch (err) {
    // If MySQL connection fails, switch to in-memory mode
    if (!useInMemory) {
      console.log('[DB] MySQL not available, switching to in-memory mode')
      useInMemory = true
      await seedInMemory()
      return memQuery(sql, params)
    }
    throw err
  }
}

// ============================================================
// In-memory query simulator (handles the SQL we use in controllers)
// ============================================================
function memQuery(sql, params) {
  const s = sql.trim().toLowerCase()

  // SELECT * FROM table
  let m = s.match(/^select \* from (\w+)(?:\s+where\s+(.*?))?(?:\s+order by\s+(.*?))?(?:\s+limit\s+(\d+))?$/)
  if (m) {
    const [, table, whereClause, orderBy, limitStr] = m
    let rows = [...memDB.tables[table]]
    if (whereClause) rows = rows.filter((r) => evalWhere(r, whereClause, params))
    if (orderBy) rows = sortRows(rows, orderBy)
    if (limitStr) rows = rows.slice(0, parseInt(limitStr))
    return rows
  }

  // SELECT * FROM table WHERE condition ORDER BY ... LIMIT ...
  // Already handled above

  // INSERT INTO table (cols) VALUES (?, ?, ...)
  m = s.match(/^insert into (\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)$/i)
  if (m) {
    const [, table, colsStr, valsStr] = m
    const cols = colsStr.split(',').map((c) => c.trim())
    const placeholders = valsStr.split(',').map((v) => v.trim())
    const row = { id: nextId(table) }
    let paramIdx = 0
    for (let i = 0; i < cols.length; i++) {
      if (placeholders[i] === '?') {
        row[cols[i]] = params[paramIdx++]
      } else if (placeholders[i] === 'now()') {
        row[cols[i]] = new Date()
      } else if (placeholders[i].startsWith("'") && placeholders[i].endsWith("'")) {
        row[cols[i]] = placeholders[i].slice(1, -1)
      } else {
        row[cols[i]] = null
      }
    }
    if (table === 'assets' && !row.tag) {
      row.tag = nextTag()
    }
    memDB.tables[table].push(row)
    return [{ insertId: row.id, tag: row.tag }]
  }

  // UPDATE table SET col=?, col=? WHERE condition
  m = s.match(/^update (\w+)\s+set\s+(.*?)\s+where\s+(.*)$/i)
  if (m) {
    const [, table, setStr, whereStr] = m
    const sets = setStr.split(',').map((s) => s.trim())
    let updated = 0
    let paramIdx = 0
    // Extract SET values first
    const setValues = []
    for (const set of sets) {
      const [col, val] = set.split('=').map((s) => s.trim())
      if (val === '?') {
        setValues.push([col, params[paramIdx++]])
      } else if (val === 'now()') {
        setValues.push([col, new Date()])
      } else if (val.startsWith("'") && val.endsWith("'")) {
        setValues.push([col, val.slice(1, -1)])
      } else {
        setValues.push([col, null])
      }
    }
    // Then apply WHERE with remaining params
    for (const row of memDB.tables[table]) {
      if (evalWhere(row, whereStr, params.slice(paramIdx))) {
        for (const [col, val] of setValues) row[col] = val
        updated++
      }
    }
    return [{ affectedRows: updated }]
  }

  // DELETE FROM table WHERE condition
  m = s.match(/^delete from (\w+)\s+where\s+(.*)$/i)
  if (m) {
    const [, table, whereStr] = m
    const before = memDB.tables[table].length
    memDB.tables[table] = memDB.tables[table].filter((r) => !evalWhere(r, whereStr, params))
    return [{ affectedRows: before - memDB.tables[table].length }]
  }

  // SELECT COUNT(*) as count FROM table WHERE condition
  m = s.match(/^select count\(\*\) as count from (\w+)(?:\s+where\s+(.*?))?$/)
  if (m) {
    const [, table, whereClause] = m
    let rows = memDB.tables[table]
    if (whereClause) rows = rows.filter((r) => evalWhere(r, whereClause, params))
    return [{ count: rows.length }]
  }

  // SELECT columns FROM table1 JOIN table2 ON ... WHERE ...
  m = s.match(/^select (.+?) from (\w+)(?:\s+(?:join|left join|inner join)\s+(\w+)\s+on\s+(.*?))?(?:\s+where\s+(.*?))?(?:\s+order by\s+(.*?))?(?:\s+limit\s+(\d+))?$/)
  if (m) {
    const [, colsStr, table1, table2, onClause, whereClause, orderBy, limitStr] = m
    let rows = memDB.tables[table1].map((r) => ({ ...r }))
    if (table2) {
      rows = rows.map((r1) => {
        const r2 = memDB.tables[table2].find((r) => evalOn(r1, r, onClause, params))
        return r2 ? { ...r1, ...Object.fromEntries(Object.entries(r2).map(([k, v]) => [`${table2}_${k}`, v])) } : r1
      })
    }
    if (whereClause) rows = rows.filter((r) => evalWhere(r, whereClause, params))
    if (orderBy) rows = sortRows(rows, orderBy)
    if (limitStr) rows = rows.slice(0, parseInt(limitStr))
    return rows
  }

  console.warn('[MEM-DB] Unhandled SQL:', sql)
  return []
}

function evalWhere(row, clause, params) {
  // Simple condition evaluator for our queries
  // Handles: col = ?, col = value, col = ? AND col2 = ?, col IS NULL, col IS NOT NULL
  let pIdx = 0
  let expr = clause.replace(/\?/g, () => {
    const v = params[pIdx++]
    return typeof v === 'string' ? `'${v}'` : String(v)
  })
  expr = expr.replace(/(\w+)\s+is\s+null/gi, '(row.$1 == null)')
  expr = expr.replace(/(\w+)\s+is\s+not\s+null/gi, '(row.$1 != null)')
  expr = expr.replace(/(\w+)\s*=\s*'([^']*)'/g, "(row.$1 == '$2')")
  expr = expr.replace(/(\w+)\s*=\s*(\d+)/g, '(row.$1 == $2)')
  expr = expr.replace(/(\w+)\s*!=\s*'([^']*)'/g, "(row.$1 != '$2')")
  expr = expr.replace(/(\w+)\s*!=\s*(\d+)/g, '(row.$1 != $2)')
  expr = expr.replace(/(\w+)\s*>\s*(\d+)/g, '(row.$1 > $2)')
  expr = expr.replace(/(\w+)\s*<\s*(\d+)/g, '(row.$1 < $2)')
  expr = expr.replace(/(\w+)\s*>=\s*(\d+)/g, '(row.$1 >= $2)')
  expr = expr.replace(/(\w+)\s*<=\s*(\d+)/g, '(row.$1 <= $2)')
  expr = expr.replace(/ and /gi, ' && ')
  expr = expr.replace(/ or /gi, ' || ')
  try {
    return eval(`(() => { const row = ${JSON.stringify(row)}; return ${expr} })()`)
  } catch {
    return false
  }
}

function evalOn(r1, r2, clause, params) {
  // Handle: table1.col = table2.col
  const m = clause.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/)
  if (m) {
    const [, t1, c1, t2, c2] = m
    return r1[c1] === r2[c2]
  }
  return false
}

function sortRows(rows, orderBy) {
  const [col, dir] = orderBy.trim().split(/\s+/)
  return rows.sort((a, b) => {
    if (a[col] < b[col]) return dir === 'desc' ? 1 : -1
    if (a[col] > b[col]) return dir === 'desc' ? -1 : 1
    return 0
  })
}

// ============================================================
// Seed in-memory DB with demo data
// ============================================================
async function seedInMemory() {
  if (memDB.tables.users.length > 0) return

  const bcryptModule = await import('bcryptjs')
  const bcrypt = bcryptModule.default || bcryptModule
  const hash = (pw) => bcrypt.hashSync(pw, 10)

  // Departments
  const engDept = { id: nextId('departments'), name: 'Engineering', head_user_id: null, parent_department_id: null, status: 'active', created_at: new Date() }
  const opsDept = { id: nextId('departments'), name: 'Operations', head_user_id: null, parent_department_id: null, status: 'active', created_at: new Date() }
  const facDept = { id: nextId('departments'), name: 'Facilities', head_user_id: null, parent_department_id: null, status: 'active', created_at: new Date() }
  memDB.tables.departments.push(engDept, opsDept, facDept)

  // Users
  const admin = { id: nextId('users'), name: 'Alex Admin', email: 'admin@assetflow.demo', password: hash('Demo1234!'), role: 'admin', department_id: null, status: 'active', created_at: new Date() }
  const manager = { id: nextId('users'), name: 'Morgan Manager', email: 'manager@assetflow.demo', password: hash('Demo1234!'), role: 'asset_manager', department_id: null, status: 'active', created_at: new Date() }
  const head = { id: nextId('users'), name: 'Dana Department', email: 'head@assetflow.demo', password: hash('Demo1234!'), role: 'department_head', department_id: engDept.id, status: 'active', created_at: new Date() }
  const priya = { id: nextId('users'), name: 'Priya Patel', email: 'priya@assetflow.demo', password: hash('Demo1234!'), role: 'employee', department_id: engDept.id, status: 'active', created_at: new Date() }
  const raj = { id: nextId('users'), name: 'Raj Kumar', email: 'raj@assetflow.demo', password: hash('Demo1234!'), role: 'employee', department_id: opsDept.id, status: 'active', created_at: new Date() }
  memDB.tables.users.push(admin, manager, head, priya, raj)
  engDept.head_user_id = head.id

  // Categories
  const electronics = { id: nextId('asset_categories'), name: 'Electronics', custom_fields: JSON.stringify({ warranty_period: '24 months' }), created_at: new Date() }
  const furniture = { id: nextId('asset_categories'), name: 'Furniture', custom_fields: JSON.stringify({}), created_at: new Date() }
  const vehicles = { id: nextId('asset_categories'), name: 'Vehicles', custom_fields: JSON.stringify({ warranty_period: '36 months' }), created_at: new Date() }
  const rooms = { id: nextId('asset_categories'), name: 'Meeting Rooms', custom_fields: JSON.stringify({}), created_at: new Date() }
  memDB.tables.asset_categories.push(electronics, furniture, vehicles, rooms)

  // Assets
  const assets = [
    { name: 'Dell Latitude 5440', serial_number: 'SN-DELL-001', cat: electronics.id, dept: engDept.id, cost: 1200, cond: 'good', loc: 'Floor 3, Room A', bookable: false, status: 'available' },
    { name: 'MacBook Pro 14', serial_number: 'SN-APPLE-001', cat: electronics.id, dept: engDept.id, cost: 2400, cond: 'excellent', loc: 'Floor 3, Room B', bookable: false, status: 'available' },
    { name: 'Conference Room B2', serial_number: null, cat: rooms.id, dept: facDept.id, cost: 0, cond: 'good', loc: 'Floor 2', bookable: true, status: 'available' },
    { name: 'Toyota Camry', serial_number: 'VIN-TOY-001', cat: vehicles.id, dept: opsDept.id, cost: 28000, cond: 'good', loc: 'Parking Lot A', bookable: true, status: 'available' },
    { name: 'Ergonomic Chair', serial_number: 'SN-CHR-001', cat: furniture.id, dept: facDept.id, cost: 450, cond: 'good', loc: 'Floor 3, Room A', bookable: false, status: 'available' },
    { name: 'HP Monitor 27', serial_number: 'SN-HP-001', cat: electronics.id, dept: engDept.id, cost: 300, cond: 'fair', loc: 'Floor 3, Room C', bookable: false, status: 'available' },
    { name: 'Projector Epson', serial_number: 'SN-EPSON-001', cat: electronics.id, dept: facDept.id, cost: 800, cond: 'fair', loc: 'Floor 2, Storage', bookable: true, status: 'available' },
  ]
  for (const a of assets) {
    memDB.tables.assets.push({
      id: nextId('assets'), tag: nextTag(), name: a.name, category_id: a.cat, serial_number: a.serial_number,
      acquisition_date: '2024-01-15', acquisition_cost: a.cost, condition: a.cond, location: a.loc,
      photo_url: null, is_bookable: a.bookable, status: a.status, created_by: manager.id, created_at: new Date(),
    })
  }

  // Allocations
  const dell = memDB.tables.assets.find((a) => a.name === 'Dell Latitude 5440')
  const macbook = memDB.tables.assets.find((a) => a.name === 'MacBook Pro 14')
  const overdueDate = new Date(); overdueDate.setDate(overdueDate.getDate() - 10)
  const upcomingDate = new Date(); upcomingDate.setDate(upcomingDate.getDate() + 3)

  memDB.tables.allocations.push(
    { id: nextId('allocations'), asset_id: dell.id, user_id: priya.id, department_id: null, allocated_by: manager.id, allocated_date: new Date(), expected_return_date: overdueDate, actual_return_date: null, return_condition_notes: null, status: 'active', created_at: new Date() },
    { id: nextId('allocations'), asset_id: macbook.id, user_id: raj.id, department_id: null, allocated_by: manager.id, allocated_date: new Date(), expected_return_date: upcomingDate, actual_return_date: null, return_condition_notes: null, status: 'active', created_at: new Date() },
  )
  dell.status = 'allocated'
  macbook.status = 'allocated'

  // Maintenance
  const monitor = memDB.tables.assets.find((a) => a.name === 'HP Monitor 27')
  memDB.tables.maintenance_requests.push({
    id: nextId('maintenance_requests'), asset_id: monitor.id, raised_by: priya.id, issue_description: 'Screen flickering on the left side, possibly backlight issue',
    priority: 'high', photo_url: null, status: 'pending', technician_name: null, resolution_notes: null, approved_by: null, approved_at: null, resolved_at: null, created_at: new Date(),
  })

  // Booking
  const confRoom = memDB.tables.assets.find((a) => a.name === 'Conference Room B2')
  const bookingStart = new Date(); bookingStart.setHours(9, 0, 0, 0)
  const bookingEnd = new Date(); bookingEnd.setHours(10, 0, 0, 0)
  memDB.tables.bookings.push({
    id: nextId('bookings'), asset_id: confRoom.id, booked_by: head.id, start_time: bookingStart, end_time: bookingEnd,
    purpose: 'Weekly team sync', status: 'upcoming', created_at: new Date(),
  })

  // Activity logs
  memDB.tables.activity_logs.push(
    { id: nextId('activity_logs'), user_id: manager.id, action: 'Registered asset', entity_type: 'asset', entity_id: dell.id, details: JSON.stringify({ name: 'Dell Latitude 5440' }), created_at: new Date() },
    { id: nextId('activity_logs'), user_id: manager.id, action: 'Allocated asset', entity_type: 'asset', entity_id: dell.id, details: JSON.stringify({ to: 'Priya Patel' }), created_at: new Date() },
  )

  // Notifications
  memDB.tables.notifications.push(
    { id: nextId('notifications'), user_id: priya.id, type: 'asset_assigned', message: 'Dell Latitude 5440 (AF-0001) has been assigned to you.', related_id: dell.id, related_type: 'asset', is_read: false, created_at: new Date() },
    { id: nextId('notifications'), user_id: priya.id, type: 'overdue_return', message: 'Dell Latitude 5440 (AF-0001) is overdue.', related_id: null, related_type: 'allocation', is_read: false, created_at: new Date() },
  )

  console.log('[DB] In-memory seed complete')
}

export { seedInMemory }
