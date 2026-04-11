import bcrypt from 'bcrypt';
import * as userModel from '../models/user.model.js';
import * as userProfileModel from '../models/userProfile.model.js';
import * as roleModel from '../models/role.model.js';
import * as emailVerificationModel from '../models/emailVerification.model.js';
import * as passwordResetModel from '../models/passwordReset.model.js';
import * as refreshTokenModel from '../models/refreshToken.model.js';
import * as bookingModel from '../models/booking.model.js';
import { signToken } from '../config/jwt.js';
import {
  generateVerificationToken,
  getVerificationExpiryDate,
  getVerificationExpiryLabel,
} from '../utils/generateToken.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { isSmtpConfigured } from '../services/emailDelivery.service.js';
import * as notificationModel from '../models/notification.model.js';
import * as notificationService from '../services/notification.service.js';
import { verifyGoogleIdToken } from '../services/googleAuth.service.js';
import {
  normalizeIndexNumber,
  normalizePhoneToE164,
  isValidIndexNumber,
  isValidPhone,
} from '../utils/academicIdentity.js';
import { isAllowedSpecialization } from '../constants/specializations.js';
const BCRYPT_ROUNDS = 12;

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 7;

const getRefreshCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  };
};

function buildAuthUserClient(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    roleName: user.role_name,
    isVerified: user.is_verified,
    provider: user.provider,
    profileCompleted: !!user.profile_completed,
  };
}

const issueAuthResponse = async (res, user) => {
  const accessToken = signToken({ userId: user.id, email: user.email }, ACCESS_TOKEN_TTL);
  const refreshToken = generateVerificationToken(32);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await refreshTokenModel.create({ userId: user.id, token: refreshToken, expiresAt });

  res.cookie('refresh_token', refreshToken, getRefreshCookieOptions());

  return {
    token: accessToken,
    message: user.is_verified ? 'Login successful' : 'Please verify your email to unlock all features',
    user: buildAuthUserClient(user),
  };
};

function attachProfileCompletionIfNeeded(body, user) {
  if (!user.profile_completed) {
    return { success: true, requiresProfileCompletion: true, ...body };
  }
  return body;
}

/**
 * Send verification email first; only then replace DB tokens. If sending fails, leave existing tokens
 * (resume flow) or caller rolls back the new user — avoids accounts with no way to verify.
 */
async function issueRegistrationVerification(userId, { resumed }) {
  const user = await userModel.findById(userId);
  if (!user) {
    return {
      payload: null,
      emailSent: false,
      isProduction: process.env.NODE_ENV === 'production',
      emailSendError: new Error('User not found'),
    };
  }

  const token = generateVerificationToken();
  const expiresAt = getVerificationExpiryDate();
  const expiryLabel = getVerificationExpiryLabel();

  try {
    await sendVerificationEmail({
      email: user.email,
      token,
      expiresIn: expiryLabel,
    });
  } catch (emailErr) {
    console.error('Verification email failed:', emailErr);
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      payload: null,
      emailSent: false,
      isProduction,
      emailSendError: emailErr,
    };
  }

  await emailVerificationModel.deleteByUserId(userId);
  await emailVerificationModel.create({
    userId: user.id,
    token,
    expiresAt,
  });

  const payload = {
    message: resumed
      ? 'We sent a new verification link to your email.'
      : 'We sent a verification link to your email.',
    emailSent: true,
    user: {
      id: user.id,
      email: user.email,
      roleName: user.role_name,
      isVerified: false,
    },
  };
  const isProduction = process.env.NODE_ENV === 'production';

  return { payload, emailSent: true, isProduction, emailSendError: null };
}

function registrationEmailUndelivered(result) {
  const forceEmail =
    process.env.FORCE_EMAIL_VERIFICATION === '1' || process.env.FORCE_EMAIL_VERIFICATION === 'true';
  const mustDeliverEmail = result.isProduction && (forceEmail || isSmtpConfigured());
  if (result.emailSendError) return true;
  if (!result.emailSent && mustDeliverEmail) return true;
  return false;
}

export const register = async (req, res, next) => {
  try {
    const { email, password, roleName, name } = req.body;
    const emailNorm = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const existing = emailNorm ? await userModel.findByEmail(emailNorm) : null;

    const role = await roleModel.findByName(roleName);
    if (!role) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const academicYear = parseInt(req.body.academicYear, 10);
    const semester = parseInt(req.body.semester, 10);
    const specialization = typeof req.body.specialization === 'string' ? req.body.specialization.trim() : '';
    const indexNorm = normalizeIndexNumber(req.body.indexNumber);
    const phoneE164 = normalizePhoneToE164(req.body.phoneNumber);
    if (!isAllowedSpecialization(specialization) || !indexNorm || !phoneE164) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: ['Invalid academic or contact data'] });
    }

    const otherIdx = await userModel.findIdByIndexNumber(indexNorm);
    if (otherIdx && (!existing || otherIdx !== existing.id)) {
      return res.status(409).json({ error: 'Index number already exists' });
    }

    const academicPayload = {
      academicYear,
      semester,
      specialization,
      indexNumber: indexNorm,
      phoneNumber: phoneE164,
      displayName: typeof name === 'string' ? name.trim() : '',
    };

    if (existing) {
      if (existing.is_verified) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      if (existing.provider === 'google' && !existing.password_hash) {
        return res.status(409).json({
          error: 'This email is reserved for Google sign-in. Use Sign in with Google on the login page.',
          code: 'GOOGLE_SIGNUP_REQUIRED',
        });
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const previousPasswordHash = existing.password_hash;
      await userModel.updatePasswordHash(existing.id, passwordHash);
      if (existing.role_id !== role.id) {
        await userModel.updateRole(existing.id, role.id);
      }
      await userModel.updateProfile(existing.id, {
        displayName: academicPayload.displayName || null,
        academicYear: academicPayload.academicYear,
        semester: academicPayload.semester,
        specialization: academicPayload.specialization,
        indexNumber: academicPayload.indexNumber,
        phoneNumber: academicPayload.phoneNumber,
        profileCompleted: true,
      });
      const result = await issueRegistrationVerification(existing.id, { resumed: true });
      if (registrationEmailUndelivered(result)) {
        await userModel.updatePasswordHash(existing.id, previousPasswordHash);
        return res.status(503).json({
          success: false,
          error:
            result.emailSendError != null
              ? 'Failed to send verification email. Your password was not updated. Try again later.'
              : 'Failed to send verification email. Please try again later or contact support.',
          code: 'EMAIL_SEND_FAILED',
          details:
            'Email delivery failed. Confirm FRONTEND_URL matches your live app URL, RESEND_API_KEY / RESEND_FROM (Resend), or SMTP_* for your provider. Check server logs for the underlying error.',
        });
      }
      return res.status(201).json(result.payload);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let created;
    try {
      created = await userModel.create({
        email: emailNorm,
        passwordHash,
        roleId: role.id,
        academicYear,
        semester,
        specialization,
        indexNumber: indexNorm,
        phoneNumber: phoneE164,
        displayName: academicPayload.displayName || null,
      });
    } catch (dbErr) {
      if (dbErr && dbErr.code === '23505') {
        return res.status(409).json({ error: 'Index number already exists' });
      }
      throw dbErr;
    }
    if (!created) {
      return res.status(500).json({ error: 'Registration failed' });
    }
    
    // Notify admins of new registration in real-time
    notificationService.emitToAdmins('admin_metric', { action: 'registration', email: emailNorm });

    const result = await issueRegistrationVerification(created.id, { resumed: false });
    if (registrationEmailUndelivered(result)) {
      await emailVerificationModel.deleteByUserId(created.id);
      await userModel.deleteById(created.id);
      return res.status(503).json({
        success: false,
        error: 'Failed to send verification email. No account was created. Try again later.',
        code: 'EMAIL_SEND_FAILED',
        details:
          'Email delivery failed. Confirm FRONTEND_URL matches your live app URL, RESEND_API_KEY / RESEND_FROM (Resend), or SMTP_* for your provider. Check server logs for the underlying error.',
      });
    }
    return res.status(201).json(result.payload);
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Index number already exists' });
    }
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

    if (user.provider && user.provider !== 'local' && !user.password_hash) {
      return res.status(400).json({ error: 'This account uses social login. Please sign in with Google.', code: 'SOCIAL_LOGIN_REQUIRED' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = await issueAuthResponse(res, user);
    res.json(attachProfileCompletionIfNeeded(payload, user));
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
      return res.status(503).json({
        success: false,
        error: 'Could not send email. Check SMTP settings or try again later.',
        code: 'EMAIL_SEND_FAILED',
        details:
          'Email delivery failed. Confirm FRONTEND_URL and SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_SECURE/SMTP_FROM. Check server logs for the underlying error.',
      });
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
      return res.status(503).json({
        success: false,
        error: 'Failed to send verification email. Try again later.',
        code: 'EMAIL_SEND_FAILED',
        details:
          'Email delivery failed. Confirm FRONTEND_URL and SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_SECURE/SMTP_FROM. Check server logs for the underlying error.',
      });
    }

    res.json({ success: true, message: 'Verification email sent. Check your inbox.' });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (!rt) return res.status(401).json({ error: 'Refresh token missing' });

    const record = await refreshTokenModel.findValidByToken(rt);
    if (!record) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const user = await userModel.findById(record.user_id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid user' });

    // rotate: revoke old, issue new refresh
    await refreshTokenModel.revoke(record.id);

    const payload = await issueAuthResponse(res, user);
    res.json(attachProfileCompletionIfNeeded(payload, user));
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (rt) {
      const record = await refreshTokenModel.findValidByToken(rt);
      if (record) await refreshTokenModel.revoke(record.id);
    }
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const emailRaw = req.body?.email;
    const email = typeof emailRaw === 'string' ? emailRaw.toLowerCase().trim() : '';
    const generic = { success: true, message: 'If an account exists for this email, we sent a password reset link.' };
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    await passwordResetModel.deleteExpired();
    const user = await userModel.findByEmail(email);
    if (!user || !user.is_active) {
      return res.json(generic);
    }

    // allow reset for local accounts only
    if (user.provider && user.provider !== 'local' && !user.password_hash) {
      return res.json(generic);
    }

    const token = generateVerificationToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await passwordResetModel.deleteByUserId(user.id);
    await passwordResetModel.create({ userId: user.id, token, expiresAt });

    try {
      await sendPasswordResetEmail({ email: user.email, token, expiresIn: '1 hour' });
    } catch (e) {
      console.error('Password reset email failed:', e?.cause || e);
      const hint =
        'Resend test senders (e.g. onboarding@resend.dev) only deliver to your own Resend account email until you verify a domain at https://resend.com/domains and set FROM to an address on that domain.';
      return res.status(503).json({
        success: false,
        error: 'Could not send email. Try again later.',
        code: 'EMAIL_SEND_FAILED',
        details: [e?.message && String(e.message), hint].filter(Boolean).join(' '),
      });
    }
    try {
      await notificationModel.create({
        userId: user.id,
        type: 'system',
        title: 'Password reset requested',
        message: 'We sent a link to your email to reset your password.',
        metadata: { event: 'password_reset' },
        emailSent: true,
        emailSentAt: new Date(),
      });
    } catch (e) {
      console.error('Password reset in-app notification failed:', e);
    }

    return res.json(generic);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const newPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!token) return res.status(400).json({ error: 'Reset token is required' });
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const record = await passwordResetModel.findByToken(token);
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link' });

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await userModel.updatePasswordHash(record.user_id, passwordHash);
    await passwordResetModel.deleteByToken(token);

    // revoke all refresh tokens (forces re-login everywhere)
    await refreshTokenModel.revokeByUserId(record.user_id);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken : '';
    const roleNameRaw = req.body?.roleName;
    const requestedRoleName = typeof roleNameRaw === 'string' ? roleNameRaw.trim() : '';
    const payload = await verifyGoogleIdToken(idToken);
    const email = payload?.email ? String(payload.email).toLowerCase().trim() : '';
    const emailVerified = !!payload?.email_verified;
    const sub = payload?.sub ? String(payload.sub) : null;
    const name = payload?.name ? String(payload.name) : null;

    if (!email || !sub) {
      return res.status(400).json({ error: 'Invalid Google token payload' });
    }
    if (!emailVerified) {
      return res.status(403).json({ error: 'Google account email is not verified' });
    }

    let user = await userModel.findByProviderId('google', sub);
    if (!user) {
      const existingByEmail = await userModel.findByEmail(email);
      if (existingByEmail) {
        user = await userModel.linkGoogleProvider(existingByEmail.id, sub);
      } else {
        // Role for social signup:
        // - If provided, validate it (supports Register page role selection).
        // - Otherwise default to student.
        const roleToUse = requestedRoleName || 'student';
        const role = await roleModel.findByName(roleToUse);
        if (!role) {
          return res.status(400).json({ error: 'Invalid role', code: 'INVALID_ROLE' });
        }
        user = await userModel.createGoogleUser({
          email,
          roleId: role.id,
          providerId: sub,
          displayName: name,
        });
        
        // Notify admins of new registration in real-time
        notificationService.emitToAdmins('admin_metric', { action: 'registration', email: email });
      }
    }

    if (!user) {
      return res.status(500).json({
        success: false,
        error: 'Could not create or load your account after Google sign-in. Try again or register with email.',
        code: 'GOOGLE_USER_MISSING',
      });
    }

    const resp = await issueAuthResponse(res, user);
    res.json(attachProfileCompletionIfNeeded(resp, user));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const completeProfile = async (req, res, next) => {
  try {
    const userRow = await userModel.findById(req.user.id);
    if (!userRow) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (userRow.profile_completed) {
      return res.status(400).json({ success: false, error: 'Profile already completed', code: 'PROFILE_ALREADY_COMPLETE' });
    }

    const academicYear = parseInt(req.body.academicYear, 10);
    const semester = parseInt(req.body.semester, 10);
    const specialization = typeof req.body.specialization === 'string' ? req.body.specialization.trim() : '';
    const indexNorm = normalizeIndexNumber(req.body.indexNumber);
    const phoneE164 = normalizePhoneToE164(req.body.phoneNumber);

    if (!isAllowedSpecialization(specialization) || !indexNorm || !phoneE164) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: ['Invalid academic or contact data'] });
    }
    if (Number.isNaN(academicYear) || academicYear < 1 || academicYear > 4) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: ['Academic year must be between 1 and 4'] });
    }
    if (Number.isNaN(semester) || (semester !== 1 && semester !== 2)) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: ['Semester must be 1 or 2'] });
    }
    if (!isValidIndexNumber(indexNorm)) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: ['Index number must start with IT and contain only numbers after'] });
    }
    if (!isValidPhone(req.body.phoneNumber)) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: ['Enter a valid Sri Lankan mobile number'] });
    }

    const otherIdx = await userModel.findOtherUserIdByIndexNumber(indexNorm, req.user.id);
    if (otherIdx) {
      return res.status(409).json({ error: 'Index number already exists' });
    }

    try {
      await userModel.updateProfile(req.user.id, {
        academicYear,
        semester,
        specialization,
        indexNumber: indexNorm,
        phoneNumber: phoneE164,
        profileCompleted: true,
      });
    } catch (dbErr) {
      if (dbErr && dbErr.code === '23505') {
        return res.status(409).json({ error: 'Index number already exists' });
      }
      throw dbErr;
    }

    const prev = await userProfileModel.getByUserId(req.user.id);
    await userProfileModel.upsert({
      userId: req.user.id,
      phone: phoneE164,
      bio: prev?.bio ?? null,
    });

    const user = await userModel.findById(req.user.id);
    res.json({
      success: true,
      user: buildAuthUserClient(user),
    });
    
    // Notify admins of profile completion if it affects metrics
    notificationService.emitToAdmins('admin_metric', { action: 'profile_completed', email: user.email });
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
    const phone =
      user.phone_number && String(user.phone_number).trim()
        ? user.phone_number
        : profile?.phone || null;
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      roleName: user.role_name,
      isVerified: user.is_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      phone,
      bio: profile?.bio,
      indexNumber: user.index_number || null,
      academicYear: user.academic_year ?? null,
      semester: user.semester ?? null,
      specialization: user.specialization || null,
      profileCompleted: !!user.profile_completed,
      reliabilityScore: Number(reliability.score),
      reliabilityTotal: reliability.total,
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const {
      displayName,
      phone,
      bio,
      indexNumber,
      academicYear,
      semester,
      specialization,
    } = req.body;

    const errors = [];
    let idxNorm;
    if (indexNumber !== undefined) {
      idxNorm = normalizeIndexNumber(indexNumber);
      if (!idxNorm || !isValidIndexNumber(idxNorm)) {
        errors.push('Index number must start with IT and contain only numbers after');
      } else {
        const clash = await userModel.findOtherUserIdByIndexNumber(idxNorm, req.user.id);
        if (clash) errors.push('Index number already exists');
      }
    }

    let phoneE164;
    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      if (!isValidPhone(phone)) {
        errors.push('Enter a valid Sri Lankan mobile number');
      } else {
        phoneE164 = normalizePhoneToE164(phone);
      }
    } else if (phone !== undefined) {
      phoneE164 = null;
    }

    if (academicYear !== undefined && academicYear !== null && academicYear !== '') {
      const ay = parseInt(academicYear, 10);
      if (Number.isNaN(ay) || ay < 1 || ay > 4) errors.push('Academic year must be between 1 and 4');
    }

    if (semester !== undefined && semester !== null && semester !== '') {
      const sem = parseInt(semester, 10);
      if (Number.isNaN(sem) || (sem !== 1 && sem !== 2)) errors.push('Semester must be 1 or 2');
    }

    if (specialization !== undefined && specialization !== null && specialization !== '') {
      if (!isAllowedSpecialization(String(specialization))) {
        errors.push('Invalid specialization');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }

    const userPatch = {};
    if (displayName !== undefined) userPatch.displayName = displayName?.trim() || null;
    if (idxNorm !== undefined) userPatch.indexNumber = idxNorm;
    if (academicYear !== undefined) {
      userPatch.academicYear =
        academicYear === '' || academicYear === null ? null : parseInt(academicYear, 10);
    }
    if (semester !== undefined) {
      userPatch.semester = semester === '' || semester === null ? null : parseInt(semester, 10);
    }
    if (specialization !== undefined) {
      userPatch.specialization = specialization ? String(specialization).trim() : null;
    }
    if (phoneE164 !== undefined) userPatch.phoneNumber = phoneE164;

    const prevProfile = await userProfileModel.getByUserId(req.user.id);
    const user = await userModel.updateProfile(req.user.id, userPatch);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userProfileModel.upsert({
      userId: req.user.id,
      phone: user.phone_number ?? prevProfile?.phone ?? null,
      bio: bio !== undefined ? bio?.trim() || null : prevProfile?.bio ?? null,
    });
    const profile = await userProfileModel.getByUserId(req.user.id);
    const mergedPhone =
      user.phone_number && String(user.phone_number).trim()
        ? user.phone_number
        : profile?.phone || null;

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      roleName: user.role_name,
      isVerified: user.is_verified,
      isActive: user.is_active,
      createdAt: user.created_at,
      phone: mergedPhone,
      bio: profile?.bio,
      indexNumber: user.index_number || null,
      academicYear: user.academic_year ?? null,
      semester: user.semester ?? null,
      specialization: user.specialization || null,
      profileCompleted: !!user.profile_completed,
    });
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    const { avatarUrl } = req.body;
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
