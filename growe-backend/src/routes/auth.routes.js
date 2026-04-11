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

/** Separate instances so each route has its own per-IP budget (shared one limiter counted all three together). */
const requestVerificationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many resend requests. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many resend requests. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many password reset requests. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/google', authLimiter, authController.googleLogin);
router.post('/complete-profile', authLimiter, authenticate, requireVerified, authController.completeProfile);
router.post('/logout', authController.logout);
router.get('/verify-email', authController.verifyEmail);
router.post(
  '/request-verification-email',
  requestVerificationEmailLimiter,
  validateRequestVerificationEmail,
  authController.requestVerificationEmail
);
router.post('/resend-verification', authenticate, resendVerificationLimiter, authController.resendVerification);
router.post('/refresh-token', authController.refreshToken);
// Alias for clients expecting `/auth/refresh`
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/me', authenticate, authController.getProfile);
router.patch('/me', authenticate, requireVerified, authController.updateProfile);
router.post('/me/avatar', authenticate, requireVerified, (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Image upload failed' });
    next();
  });
}, authController.uploadAvatar);

export default router;
