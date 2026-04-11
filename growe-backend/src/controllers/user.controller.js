import * as userModel from '../models/user.model.js';

/**
 * GET /api/users/search?q=&limit=&page=
 * Verified + active users only; excludes current user.
 * Response is wrapped by apiEnvelope as { success, message, data }.
 */
export const search = async (req, res, next) => {
  try {
    const raw = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (raw.length < 1) {
      return res.json({ users: [], page: 1, limit: 20, hasMore: false });
    }
    if (raw.length > 120) {
      return res.status(400).json({
        error: 'Search query too long',
        code: 'QUERY_TOO_LONG',
      });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    const viewer = await userModel.findById(req.user.id);
    const viewerSpecialization = viewer?.specialization ? String(viewer.specialization).trim() : '';

    const batch = await userModel.searchPublicUsers({
      excludeUserId: req.user.id,
      q: raw,
      limit: limit + 1,
      offset,
      viewerSpecialization,
    });

    const hasMore = batch.length > limit;
    const users = hasMore ? batch.slice(0, limit) : batch;

    return res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name ?? null,
        email: u.email,
        avatar_url: u.avatar_url ?? null,
      })),
      page,
      limit,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
};
