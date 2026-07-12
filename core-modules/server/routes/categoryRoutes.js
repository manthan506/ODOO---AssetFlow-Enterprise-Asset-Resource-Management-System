import { Router } from 'express'
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'

const router = Router()

router.get('/', authMiddleware, listCategories)
router.post('/', authMiddleware, roleMiddleware('admin', 'asset_manager'), createCategory)
router.put('/:id', authMiddleware, roleMiddleware('admin', 'asset_manager'), updateCategory)
router.delete('/:id', authMiddleware, roleMiddleware('admin', 'asset_manager'), deleteCategory)

export default router
