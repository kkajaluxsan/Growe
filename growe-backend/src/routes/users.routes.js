import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { requireProfileComplete } from '../middleware/profileComplete.middleware.js';

const router = Router();

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many searches. Please slow down.' },
});

router.use(authenticate);
router.use(requireVerified);
router.use(requireProfileComplete);

router.get('/search', searchLimiter, userController.search);

export default router;
