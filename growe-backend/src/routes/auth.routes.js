import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerified } from '../middleware/verified.middleware.js';
import { uploadAvatar } from '../middleware/upload.middleware.js';
import {
  validateRegister,
  validateLogin,
  validateRequestVerificationEmail,
} from '../middleware/validation.middleware.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many attempts. Please try again later.' },
});

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many resend requests. Try again in an hour.' },
});

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post(
  '/request-verification-email',
  resendLimiter,
  validateRequestVerificationEmail,
  authController.requestVerificationEmail
);
router.post('/resend-verification', authenticate, resendLimiter, authController.resendVerification);
router.post('/refresh-token', authenticate, authController.refreshToken);

router.get('/me', authenticate, requireVerified, authController.getProfile);
router.patch('/me', authenticate, requireVerified, authController.updateProfile);
router.post('/me/avatar', authenticate, requireVerified, (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Image upload failed' });
    next();
  });
}, authController.uploadAvatar);

export default router;
