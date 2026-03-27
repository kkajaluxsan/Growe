import * as notificationModel from '../models/notification.model.js';

export const list = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const unreadOnly = req.query.unreadOnly === '1' || req.query.unreadOnly === 'true';
    const items = await notificationModel.listForUser(req.user.id, { limit, offset, unreadOnly });
    const unreadCount = await notificationModel.countUnread(req.user.id);
    res.json({ notifications: items, unreadCount });
  } catch (err) {
    next(err);
  }
};

export const unreadCount = async (req, res, next) => {
  try {
    const count = await notificationModel.countUnread(req.user.id);
    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const updated = await notificationModel.markRead(req.params.id, req.user.id);
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const n = await notificationModel.markAllRead(req.user.id);
    res.json({ success: true, updated: n });
  } catch (err) {
    next(err);
  }
};
