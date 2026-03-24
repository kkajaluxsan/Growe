import { Router } from 'express';
import * as assignmentController from '../controllers/assignment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { requireAssignmentOwner } from '../middleware/assignment.middleware.js';
import {
  validateAssignmentCreate,
  validateAssignmentUpdate,
} from '../middleware/validation.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.post('/', validateAssignmentCreate, assignmentController.create);
router.get('/', assignmentController.list);
router.get('/:id', requireAssignmentOwner, assignmentController.getById);
router.patch('/:id', requireAssignmentOwner, validateAssignmentUpdate, assignmentController.update);
router.delete('/:id', requireAssignmentOwner, assignmentController.remove);

export default router;
