import { Router } from 'express'
import { listBookings, createBooking, cancelBooking } from '../controllers/bookingController.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', authMiddleware, listBookings)
router.post('/', authMiddleware, createBooking)
router.put('/:id/cancel', authMiddleware, cancelBooking)

export default router
