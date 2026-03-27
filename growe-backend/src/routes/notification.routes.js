import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireVerified);

router.get('/unread-count', notificationController.unreadCount);
router.post('/read-all', notificationController.markAllRead);
router.post('/:id/read', notificationController.markRead);
router.get('/', notificationController.list);

export default router;
