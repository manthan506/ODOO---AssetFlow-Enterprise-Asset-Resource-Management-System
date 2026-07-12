import { Router } from 'express'
import { listAllocations, createAllocation, returnAllocation, listTransferRequests, createTransferRequest, approveTransfer } from '../controllers/allocationController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'

const router = Router()

router.get('/', authMiddleware, listAllocations)
router.post('/', authMiddleware, roleMiddleware('admin', 'asset_manager', 'department_head'), createAllocation)
router.put('/:id/return', authMiddleware, returnAllocation)
router.post('/transfer', authMiddleware, createTransferRequest)
router.get('/transfer', authMiddleware, listTransferRequests)
router.put('/transfer/:id/approve', authMiddleware, roleMiddleware('admin', 'asset_manager'), approveTransfer)

export default router
