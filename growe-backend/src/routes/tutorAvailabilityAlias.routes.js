import { Router } from 'express';
import * as tutorController from '../controllers/tutor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validateAvailabilityCreate } from '../middleware/validation.middleware.js';

// Alias routes to match `/tutor/availability*` naming used in some clients/docs.
// Canonical routes remain under `/tutors/availability*`.
const router = Router();

router.use(authenticate);
router.use(requireVerified);
router.use(requireRole('tutor'));

router.post('/availability', validateAvailabilityCreate, tutorController.addAvailability);
router.get('/availability', tutorController.listAvailability);
router.delete('/availability/:id', tutorController.deleteAvailability);

export default router;

