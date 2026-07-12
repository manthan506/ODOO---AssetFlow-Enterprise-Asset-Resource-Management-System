import { query } from '../config/db.js'

export async function getDashboardStats(req, res) {
  const allAssets = await query("SELECT * FROM assets WHERE status != 'retired'")
  const availableAssets = await query("SELECT COUNT(*) as count FROM assets WHERE status = 'available'")
  const allocatedAssets = await query("SELECT COUNT(*) as count FROM assets WHERE status = 'allocated'")
  const underMaintenance = await query("SELECT COUNT(*) as count FROM assets WHERE status = 'under_maintenance'")
  const activeAllocations = await query("SELECT COUNT(*) as count FROM allocations WHERE status = 'active'")
  const overdueAllocations = await query("SELECT COUNT(*) as count FROM allocations WHERE status = 'active' AND expected_return_date < NOW()")
  const pendingMaintenance = await query("SELECT COUNT(*) as count FROM maintenance_requests WHERE status = 'pending'")
  const upcomingBookings = await query("SELECT COUNT(*) as count FROM bookings WHERE status = 'upcoming'")
  const totalUsers = await query("SELECT COUNT(*) as count FROM users WHERE status = 'active'")

  const totalValue = allAssets.reduce((sum, a) => sum + (a.acquisition_cost || 0), 0)

  res.json({
    stats: {
      totalAssets: allAssets.length,
      availableAssets: availableAssets[0]?.count || 0,
      allocatedAssets: allocatedAssets[0]?.count || 0,
      underMaintenance: underMaintenance[0]?.count || 0,
      activeAllocations: activeAllocations[0]?.count || 0,
      overdueAllocations: overdueAllocations[0]?.count || 0,
      pendingMaintenance: pendingMaintenance[0]?.count || 0,
      upcomingBookings: upcomingBookings[0]?.count || 0,
      totalValue,
      totalUsers: totalUsers[0]?.count || 0,
    },
  })
}

export async function getActivityLogs(req, res) {
  const { limit } = req.query
  const lim = parseInt(limit) || 50
  const logs = await query('SELECT * FROM activity_logs ORDER BY id DESC')
  const users = await query('SELECT * FROM users')
  const result = logs.slice(0, lim).map((l) => ({
    ...l,
    user_name: users.find((u) => u.id === l.user_id)?.name ?? 'System',
  }))
  res.json({ logs: result })
}

export async function getCategoryBreakdown(req, res) {
  const categories = await query('SELECT * FROM asset_categories')
  const assets = await query("SELECT * FROM assets WHERE status != 'retired'")
  const breakdown = categories.map((c) => ({
    category_name: c.name,
    count: assets.filter((a) => a.category_id === c.id).length,
    value: assets.filter((a) => a.category_id === c.id).reduce((sum, a) => sum + (a.acquisition_cost || 0), 0),
  })).sort((a, b) => b.count - a.count)
  res.json({ breakdown })
}

export async function getStatusBreakdown(req, res) {
  const assets = await query("SELECT status, COUNT(*) as count FROM assets WHERE status != 'retired' GROUP BY status")
  res.json({ breakdown: assets })
}

export async function getAllocationTrend(req, res) {
  const allocations = await query('SELECT * FROM allocations')
  const trend = []
  const dateMap = {}
  allocations.forEach((a) => {
    const date = a.allocated_date ? new Date(a.allocated_date).toISOString().split('T')[0] : null
    if (date) dateMap[date] = (dateMap[date] || 0) + 1
  })
  for (const [date, count] of Object.entries(dateMap)) {
    trend.push({ date, count })
  }
  trend.sort((a, b) => new Date(a.date) - new Date(b.date))
  res.json({ trend })
}
