import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as messagingController from '../controllers/messaging.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { validateMessageSend, validateMessageEdit } from '../middleware/validation.middleware.js';

const router = Router();

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many messages. Please slow down.' },
});

router.use(authenticate);
router.use(requireVerified);

router.get('/conversations', messagingController.listConversations);
router.get('/conversations/eligible-users', messagingController.getEligibleUsers);
router.post('/conversations/direct/:userId', messagingController.getOrCreateDirect);
router.post('/conversations/group/:groupId', messagingController.getOrCreateGroup);
router.get('/conversations/meeting/:meetingId', messagingController.getOrCreateMeeting);
router.get('/conversations/:id', messagingController.getConversation);
router.get('/conversations/:id/messages', messagingController.getMessages);
router.post('/conversations/:id/messages', validateMessageSend, messageLimiter, messagingController.sendMessage);
router.get('/conversations/:id/unread-count', messagingController.getUnreadCount);
router.post('/conversations/:id/read', messagingController.markAsRead);

router.put('/messages/:id', validateMessageEdit, messageLimiter, messagingController.editMessage);
router.delete('/messages/:id', messagingController.deleteMessage);

export default router;
