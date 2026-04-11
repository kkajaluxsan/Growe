import { Router } from 'express';
import * as tutorController from '../controllers/tutor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  validateTutorProfile,
  validateAvailabilityCreate,
} from '../middleware/validation.middleware.js';
import { requireProfileComplete } from '../middleware/profileComplete.middleware.js';

const router = Router();

router.get('/list', authenticate, requireVerified, requireProfileComplete, tutorController.listTutors);
router.get('/slots', authenticate, requireVerified, requireProfileComplete, tutorController.getAvailableSlots);
router.get('/available', authenticate, requireVerified, requireProfileComplete, tutorController.getAvailableTutorsByDate);
router.get(
  '/available-for-slot',
  authenticate,
  requireVerified,
  requireProfileComplete,
  requireRole('student', 'tutor'),
  tutorController.getAvailableForGroupSlot
);
router.get('/:id/ratings', authenticate, requireVerified, tutorController.getTutorRatings);

router.use(authenticate);
router.use(requireVerified);
router.use(requireProfileComplete);
router.use(requireRole('tutor'));

router.get('/group-invites', tutorController.listPendingGroupInvites);
router.get('/my-ratings', tutorController.getMyRatings);

router.post('/profile', validateTutorProfile, tutorController.createProfile);
router.get('/profile', tutorController.getProfile);
router.patch('/profile', validateTutorProfile, tutorController.updateProfile);

router.post('/availability', validateAvailabilityCreate, tutorController.addAvailability);
router.get('/availability', tutorController.listAvailability);
router.delete('/availability/:id', tutorController.deleteAvailability);

export default router;
