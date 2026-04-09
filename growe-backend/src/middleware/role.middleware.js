export const requireRole = (...allowedRoles) => {
  const allowed = allowedRoles.map((r) => String(r).toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const role = String(req.user.roleName || '').toLowerCase();
    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
      });
    }
    next();
  };
};
