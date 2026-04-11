import * as userModel from '../models/user.model.js';

/**
 * Blocks API access until academic profile is completed (profile_completed = true).
 * Use after authenticate + requireVerified on feature routes.
 */
export const requireProfileComplete = async (req, res, next) => {
  try {
    const u = await userModel.findById(req.user.id);
    if (!u) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    if (!u.profile_completed) {
      return res.status(403).json({
        success: false,
        error: 'Profile completion required',
        code: 'PROFILE_INCOMPLETE',
        requiresProfileCompletion: true,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
