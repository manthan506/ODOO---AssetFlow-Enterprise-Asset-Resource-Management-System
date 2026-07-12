import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { query, seedInMemory } from './config/db.js'

import authRoutes from './routes/authRoutes.js'
import departmentRoutes from './routes/departmentRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import assetRoutes from './routes/assetRoutes.js'
import allocationRoutes from './routes/allocationRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'
import maintenanceRoutes from './routes/maintenanceRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'

dotenv.config()

const app = express()
const PORT = 5001

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'running' })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/assets', assetRoutes)
app.use('/api/allocations', allocationRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/audits', auditRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/notifications', notificationRoutes)

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

// Initialize: trigger in-memory seeding if MySQL is unavailable
async function start() {
  try {
    // Try a simple query to see if MySQL is available
    await query('SELECT 1 as test')
    console.log('[SERVER] Connected to MySQL')
  } catch {
    console.log('[SERVER] MySQL not available — using in-memory mode')
    await seedInMemory()
  }
  app.listen(PORT, () => {
    console.log(`[SERVER] AssetFlow API running on http://localhost:${PORT}`)
  })
}

start()
