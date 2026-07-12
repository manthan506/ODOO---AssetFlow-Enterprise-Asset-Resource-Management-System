import { Router } from 'express'
import { signup, login, me, listUsers, updateRole } from '../controllers/authController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { roleMiddleware } from '../middleware/roleMiddleware.js'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', authMiddleware, me)
router.get('/users', authMiddleware, listUsers)
router.put('/users/:id/role', authMiddleware, roleMiddleware('admin'), updateRole)

export default router
