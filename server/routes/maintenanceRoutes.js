import { Router } from 'express'
import { listMaintenance, createMaintenance, approveMaintenance, resolveMaintenance } from '../controllers/maintenanceController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'

const router = Router()

router.get('/', authMiddleware, listMaintenance)
router.post('/', authMiddleware, createMaintenance)
router.put('/:id/approve', authMiddleware, roleMiddleware('admin', 'asset_manager'), approveMaintenance)
router.put('/:id/resolve', authMiddleware, roleMiddleware('admin', 'asset_manager'), resolveMaintenance)

export default router
