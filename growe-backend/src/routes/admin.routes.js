import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import { validateAdminUserUpdate } from '../middleware/validation.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/metrics', adminController.getDashboardMetrics);
router.get('/meetings', adminController.listActiveMeetings);
router.get('/users', adminController.listUsers);
router.patch('/users/:id', validateAdminUserUpdate, adminController.updateUser);
router.delete('/users/:id', adminController.removeUser);
router.post('/tutors/:id/suspend', adminController.suspendTutor);
router.post('/tutors/:id/unsuspend', adminController.unsuspendTutor);
router.post('/meetings/:id/terminate', adminController.terminateMeeting);
router.get('/bookings/logs', adminController.getBookingLogs);
router.get('/reliability-ranking', adminController.getReliabilityRanking);
router.get('/audit-log', adminController.getAuditLog);

export default router;
