import { verifyToken } from '../config/jwt.js';
import * as userModel from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await userModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name,
      isVerified: user.is_verified,
      isActive: user.is_active,
    };
    next();
  } catch (err) {
    next(err);
  }
};
