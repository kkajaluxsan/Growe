import { Router } from 'express';
import * as tutorController from '../controllers/tutor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  validateTutorProfile,
  validateAvailabilityCreate,
} from '../middleware/validation.middleware.js';

const router = Router();

router.get('/list', authenticate, requireVerified, tutorController.listTutors);
router.get('/slots', authenticate, requireVerified, tutorController.getAvailableSlots);

router.use(authenticate);
router.use(requireVerified);
router.use(requireRole('tutor'));

router.post('/profile', validateTutorProfile, tutorController.createProfile);
router.get('/profile', tutorController.getProfile);
router.patch('/profile', validateTutorProfile, tutorController.updateProfile);

router.post('/availability', validateAvailabilityCreate, tutorController.addAvailability);
router.get('/availability', tutorController.listAvailability);
router.delete('/availability/:id', tutorController.deleteAvailability);

export default router;
