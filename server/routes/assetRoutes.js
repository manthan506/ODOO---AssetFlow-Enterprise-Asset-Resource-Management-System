import { Router } from 'express'
import { listAssets, getAsset, createAsset, updateAsset, deleteAsset } from '../controllers/assetController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'

const router = Router()

router.get('/', authMiddleware, listAssets)
router.get('/:id', authMiddleware, getAsset)
router.post('/', authMiddleware, roleMiddleware('admin', 'asset_manager'), createAsset)
router.put('/:id', authMiddleware, roleMiddleware('admin', 'asset_manager'), updateAsset)
router.delete('/:id', authMiddleware, roleMiddleware('admin', 'asset_manager'), deleteAsset)

export default router
