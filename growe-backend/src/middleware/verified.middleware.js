export const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.isVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
};
