import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  validateBookingCreate,
  validateBookingStatus,
} from '../middleware/validation.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.post('/', requireRole('student'), validateBookingCreate, bookingController.create);
router.get('/', bookingController.list);
router.get('/:id', bookingController.getById);
router.patch('/:id/cancel', bookingController.cancel);
router.patch('/:id/status', requireRole('tutor'), validateBookingStatus, bookingController.updateStatus);

export default router;
