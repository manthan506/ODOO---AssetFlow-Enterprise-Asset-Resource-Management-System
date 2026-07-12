import { Router } from 'express'
import { listDepartments, createDepartment, updateDepartment } from '../controllers/departmentController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'

const router = Router()

router.get('/', authMiddleware, listDepartments)
router.post('/', authMiddleware, roleMiddleware('admin', 'asset_manager'), createDepartment)
router.put('/:id', authMiddleware, roleMiddleware('admin', 'asset_manager'), updateDepartment)

export default router
