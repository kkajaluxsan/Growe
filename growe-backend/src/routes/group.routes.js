import { Router } from 'express';
import * as groupController from '../controllers/group.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  requireGroupMember,
  requireGroupCreator,
} from '../middleware/group.middleware.js';
import {
  validateGroupCreate,
  validateGroupUpdate,
} from '../middleware/validation.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.post('/', requireRole('student', 'tutor'), validateGroupCreate, groupController.create);
router.get('/', groupController.list);
router.get('/:id', requireGroupMember, groupController.getById);
router.patch('/:id', requireGroupCreator, validateGroupUpdate, groupController.update);
router.delete('/:id', requireGroupCreator, groupController.remove);

router.post('/:id/join-request', requireRole('student', 'tutor'), groupController.requestJoin);
router.post('/:id/approve/:userId', requireGroupCreator, groupController.approveJoin);
router.get('/:id/members', requireGroupMember, groupController.listMembers);

export default router;
