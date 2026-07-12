import { Router } from 'express'
import { listNotifications, markRead, markAllRead, deleteNotification } from '../controllers/notificationController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', authMiddleware, listNotifications)
router.put('/:id/read', authMiddleware, markRead)
router.put('/read-all', authMiddleware, markAllRead)
router.delete('/:id', authMiddleware, deleteNotification)

export default router
