import crypto from 'crypto';

/**
 * @returns {number} Expiry duration in ms (clamped 15 min – 24 h)
 */
export const getVerificationExpiryMs = () => {
  const mins = parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_MINUTES || '60', 10);
  const clamped = Number.isFinite(mins) ? Math.min(Math.max(mins, 15), 24 * 60) : 60;
  return clamped * 60 * 1000;
};

export const getVerificationExpiryDate = () => new Date(Date.now() + getVerificationExpiryMs());

/** Human-readable expiry for emails (e.g. "60 minutes", "2 hours") */
export const getVerificationExpiryLabel = () => {
  const mins = Math.round(getVerificationExpiryMs() / 60000);
  if (mins < 120) return `${mins} minutes`;
  if (mins < 1440) return `${Math.round(mins / 60)} hours`;
  return '24 hours';
};

/**
 * Generate a cryptographically secure random token for email verification.
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string} Hex-encoded token
 */
export const generateVerificationToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a token for secure storage (e.g. in DB). Use for lookup instead of storing plain token.
 */
export const hashVerificationToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
