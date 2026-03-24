import crypto from 'crypto';

const COOKIE_NAME = 'growe-csrf';
const HEADER_NAME = 'x-csrf-token';
const SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'csrf-secret';
const COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

/**
 * Issue a CSRF token: set cookie and return token for the client to send in header on next mutating request.
 */
export const issueCsrfToken = (req, res) => {
  const token = crypto.randomBytes(24).toString('hex');
  const signed = `${token}.${sign(token)}`;
  res.cookie(COOKIE_NAME, signed, COOKIE_OPTIONS);
  res.json({ csrfToken: signed });
};

/**
 * Validate that the request carries a CSRF token that matches our cookie (double-submit).
 * Skip for GET, HEAD, OPTIONS. In development can be disabled via DISABLE_CSRF=1.
 */
export const validateCsrf = (req, res, next) => {
  if (process.env.DISABLE_CSRF === '1') return next();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = req.get(HEADER_NAME) || req.get(HEADER_NAME.toLowerCase());
  if (!cookieToken || !headerToken) {
    return res.status(403).json({ success: false, error: 'CSRF token missing' });
  }
  if (cookieToken !== headerToken) {
    return res.status(403).json({ success: false, error: 'CSRF token invalid' });
  }
  const [value, sig] = cookieToken.split('.');
  if (!value || !sig || sign(value) !== sig) {
    return res.status(403).json({ success: false, error: 'CSRF token invalid' });
  }
  next();
};
