import { Router } from 'express'
import { getDashboardStats, getActivityLogs, getCategoryBreakdown, getStatusBreakdown, getAllocationTrend } from '../controllers/reportController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/dashboard', authMiddleware, getDashboardStats)
router.get('/activity', authMiddleware, getActivityLogs)
router.get('/category-breakdown', authMiddleware, getCategoryBreakdown)
router.get('/status-breakdown', authMiddleware, getStatusBreakdown)
router.get('/allocation-trend', authMiddleware, getAllocationTrend)

export default router
