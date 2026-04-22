import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { validateAiChat } from '../middleware/validation.middleware.js';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/status', authenticate, requireVerified, aiController.status);
router.post('/chat', authenticate, requireVerified, aiLimiter, validateAiChat, aiController.chat);
router.post('/flashcards', authenticate, requireVerified, aiLimiter, aiController.generateFlashcards);

export default router;
