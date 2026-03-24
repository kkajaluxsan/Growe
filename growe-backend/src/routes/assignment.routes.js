import { Router } from 'express';
import * as assignmentController from '../controllers/assignment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { requireAssignmentOwnerOrAdmin } from '../middleware/assignment.middleware.js';
import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
  assignmentListQuerySchema,
  assignmentIdParamSchema,
  validateBody,
  validateQuery,
  validateParams,
} from '../validation/assignment.schema.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.post('/', validateBody(assignmentCreateSchema), assignmentController.create);
router.get('/', validateQuery(assignmentListQuerySchema), assignmentController.list);
router.get(
  '/:id',
  validateParams(assignmentIdParamSchema),
  requireAssignmentOwnerOrAdmin,
  assignmentController.getById
);
router.patch(
  '/:id',
  validateParams(assignmentIdParamSchema),
  requireAssignmentOwnerOrAdmin,
  validateBody(assignmentUpdateSchema),
  assignmentController.update
);
router.delete(
  '/:id',
  validateParams(assignmentIdParamSchema),
  requireAssignmentOwnerOrAdmin,
  assignmentController.remove
);

export default router;
