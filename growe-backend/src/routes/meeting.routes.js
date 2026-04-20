import { Router } from 'express';
import * as groupController from '../controllers/group.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { validateMeetingCreate } from '../middleware/validation.middleware.js';
import { requireProfileComplete } from '../middleware/profileComplete.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);
router.use(requireProfileComplete);

router.post('/', validateMeetingCreate, groupController.createMeeting);
router.get('/', groupController.listMeetings);
router.get('/:id', groupController.getMeetingById);

export default router;
