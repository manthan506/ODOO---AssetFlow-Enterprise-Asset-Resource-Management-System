import { Router } from 'express'
import { listAuditCycles, createAuditCycle, getAuditCycle, updateAuditItem, closeAuditCycle } from '../controllers/auditController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'

const router = Router()

router.get('/', authMiddleware, listAuditCycles)
router.post('/', authMiddleware, roleMiddleware('admin', 'asset_manager'), createAuditCycle)
router.get('/:id', authMiddleware, getAuditCycle)
router.put('/items/:id', authMiddleware, updateAuditItem)
router.put('/:id/close', authMiddleware, roleMiddleware('admin', 'asset_manager'), closeAuditCycle)

export default router
