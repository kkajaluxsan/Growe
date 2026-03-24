import bcrypt from 'bcrypt';
import * as userModel from '../models/user.model.js';
import * as userProfileModel from '../models/userProfile.model.js';
import * as roleModel from '../models/role.model.js';
import * as emailVerificationModel from '../models/emailVerification.model.js';
import * as bookingModel from '../models/booking.model.js';
import { signToken } from '../config/jwt.js';
import {
  generateVerificationToken,
  getVerificationExpiryDate,
  getVerificationExpiryLabel,
} from '../utils/generateToken.js';
import { sendVerificationEmail } from '../services/email.service.js';

const BCRYPT_ROUNDS = 12;

export const register = async (req, res, next) => {
  try {
    const { email, password, roleName } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const role = await roleModel.findByName(roleName);
    if (!role) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userModel.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      roleId: role.id,
    });

    const token = generateVerificationToken();
    const expiresAt = getVerificationExpiryDate();
    const expiryLabel = getVerificationExpiryLabel();
    await emailVerificationModel.create({
      userId: user.id,
      token,
      expiresAt,
    });

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${encodeURIComponent(token)}`;

    const skipEmailVerification =
      process.env.NODE_ENV === 'development' &&
      process.env.FORCE_EMAIL_VERIFICATION !== '1' &&
      !process.env.SMTP_USER;

    let isVerified = false;
    if (skipEmailVerification) {
      await userModel.updateVerification(user.id, true);
      await emailVerificationModel.deleteByUserId(user.id);
      isVerified = true;
    } else {
      try {
        await sendVerificationEmail({
          email: user.email,
          token,
          expiresIn: expiryLabel,
        });
      } catch (emailErr) {
        console.error('Verification email failed:', emailErr);
        return res.status(503).json({
          success: false,
          error:
            'Account created but we could not send the verification email. On the login page, use "Resend verification email" with your address, or configure SMTP.',
        });
      }
    }

    const payload = {
      message: skipEmailVerification
        ? 'Registration successful. You can log in now (dev: email skip).'
        : 'Registration successful. Please verify your email by clicking the link we sent you.',
      user: {
        id: user.id,
        email: user.email,
        roleName,
        isVerified,
      },
    };
    if (process.env.NODE_ENV === 'development') {
      payload.verificationLink = verificationUrl;
    }

    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Please verify your email before signing in. Check your inbox or request a new verification link.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        roleName: user.role_name,
        isVerified: user.is_verified,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const raw = req.query.token;
    const token = typeof raw === 'string' ? raw.trim() : '';
    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token required', code: 'TOKEN_MISSING' });
    }

    await emailVerificationModel.deleteExpiredTokens();

    const record = await emailVerificationModel.findByToken(token);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification link. Request a new one from the login page.',
        code: 'TOKEN_INVALID_OR_EXPIRED',
      });
    }

    await userModel.updateVerification(record.user_id, true);
    await emailVerificationModel.deleteByToken(token);

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Public: request a new verification email by address (no login required).
 * Uses generic success message when email is unknown or already verified (anti-enumeration).
 */
export const requestVerificationEmail = async (req, res, next) => {
  try {
    const emailRaw = req.body?.email;
    const email = typeof emailRaw === 'string' ? emailRaw.toLowerCase().trim() : '';
    const genericSuccess = {
      success: true,
      message: 'If an account exists for this email and is not verified, we sent a verification link.',
    };

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const user = await userModel.findByEmail(email);
    if (!user || user.is_verified) {
      return res.json(genericSuccess);
    }

    const existing = await emailVerificationModel.findValidByUserId(user.id);
    if (existing) {
      const expiresAt = new Date(existing.expires_at);
      const minsLeft = Math.round((expiresAt - Date.now()) / 60000);
      if (minsLeft > 20) {
        return res.status(429).json({
          success: false,
          error: `Please wait before requesting another email. Try again in about ${minsLeft} minutes.`,
          code: 'RESEND_TOO_SOON',
        });
      }
    }

    const token = generateVerificationToken();
    const expiresAt = getVerificationExpiryDate();
    const expiryLabel = getVerificationExpiryLabel();
    await emailVerificationModel.deleteByUserId(user.id);
    await emailVerificationModel.create({ userId: user.id, token, expiresAt });

    try {
      await sendVerificationEmail({ email: user.email, token, expiresIn: expiryLabel });
    } catch (emailErr) {
      console.error('Request verification email failed:', emailErr);
      return res.status(503).json({ success: false, error: 'Could not send email. Check SMTP settings or try again later.' });
    }

    return res.json(genericSuccess);
  } catch (err) {
    next(err);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    if (req.user.isVerified) {
      return res.status(400).json({ success: false, error: 'Email is already verified' });
    }

    const existing = await emailVerificationModel.findValidByUserId(req.user.id);
    if (existing) {
      const expiresAt = new Date(existing.expires_at);
      const minsLeft = Math.round((expiresAt - Date.now()) / 60000);
      if (minsLeft > 20) {
        return res.status(429).json({ success: false, error: `Please wait before requesting another email. Try again in ${minsLeft} minutes.`, code: 'RESEND_TOO_SOON' });
      }
    }

    const user = await userModel.findById(req.user.id);
    const token = generateVerificationToken();
    const expiresAt = getVerificationExpiryDate();
    const expiryLabel = getVerificationExpiryLabel();
    await emailVerificationModel.deleteByUserId(req.user.id);
    await emailVerificationModel.create({ userId: req.user.id, token, expiresAt });

    try {
      await sendVerificationEmail({ email: user.email, token, expiresIn: expiryLabel });
    } catch (emailErr) {
      console.error('Resend verification email failed:', emailErr);
      return res.status(503).json({ success: false, error: 'Failed to send verification email. Try again later.' });
    }

    res.json({ success: true, message: 'Verification email sent. Check your inbox.' });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || !user.is_verified) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        roleName: user.role_name,
        isVerified: user.is_verified,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profile = await userProfileModel.getByUserId(req.user.id);
    const reliability = await bookingModel.getReliabilityByStudentId(req.user.id);
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      roleName: user.role_name,
      isVerified: user.is_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      phone: profile?.phone,
      bio: profile?.bio,
      reliabilityScore: Number(reliability.score),
      reliabilityTotal: reliability.total,
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { displayName, phone, bio } = req.body;
    const user = await userModel.updateProfile(req.user.id, { displayName: displayName?.trim() || null });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await userProfileModel.upsert({ userId: req.user.id, phone: phone?.trim(), bio: bio?.trim() });
    const profile = await userProfileModel.getByUserId(req.user.id);
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      roleName: user.role_name,
      isVerified: user.is_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      phone: profile?.phone,
      bio: profile?.bio,
    });
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await userModel.updateProfile(req.user.id, { avatarUrl });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      avatarUrl,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        roleName: user.role_name,
        isVerified: user.is_verified,
      },
    });
  } catch (err) {
    next(err);
  }
};
