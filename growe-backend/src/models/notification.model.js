import { query } from '../config/db.js';

export const create = async ({
  userId,
  type,
  title,
  message,
  metadata = {},
  emailSent = false,
  emailSentAt = null,
}) => {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, message, metadata, email_sent, email_sent_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     RETURNING id, user_id, type, title, message, is_read, email_sent, email_sent_at, metadata, created_at`,
    [userId, type, title, message, JSON.stringify(metadata), emailSent, emailSentAt]
  );
  return rows[0];
};

export const updateEmailSent = async (id, sentAt = new Date()) => {
  const { rows } = await query(
    `UPDATE notifications SET email_sent = true, email_sent_at = $2 WHERE id = $1
     RETURNING id`,
    [id, sentAt]
  );
  return rows[0] || null;
};

export const findByIdForUser = async (id, userId) => {
  const { rows } = await query(
    `SELECT id, user_id, type, title, message, is_read, email_sent, email_sent_at, metadata, created_at
     FROM notifications WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] || null;
};

export const listForUser = async (userId, { limit = 30, offset = 0, unreadOnly = false } = {}) => {
  let sql = `SELECT id, user_id, type, title, message, is_read, metadata, created_at
     FROM notifications WHERE user_id = $1`;
  const params = [userId];
  if (unreadOnly) {
    sql += ` AND is_read = false`;
  }
  sql += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
  params.push(Math.min(100, Math.max(1, limit)), Math.max(0, offset));
  const { rows } = await query(sql, params);
  return rows;
};

export const countUnread = async (userId) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return rows[0]?.c ?? 0;
};

export const markRead = async (id, userId) => {
  const { rows } = await query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId]
  );
  return rows[0] || null;
};

export const markAllRead = async (userId) => {
  const { rowCount } = await query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return rowCount;
};
