import { query } from '../config/db.js';

/**
 * Users the current user can see for messaging pickers.
 * - Admins: all active users (except self), optional search.
 * - Others: all verified + active users (except self), optional search (Teams-like).
 */
export const listEligibleUsers = async (userId, isAdmin, { search = '', limit = 30 } = {}) => {
  const searchTerm = typeof search === 'string' && search.trim() ? `%${search.trim().toLowerCase()}%` : null;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));

  if (isAdmin) {
    let sql = `
      SELECT u.id, u.email, u.display_name, u.avatar_url, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = true AND u.id != $1
    `;
    const params = [userId];
    if (searchTerm) {
      params.push(searchTerm, searchTerm);
      sql += ` AND (LOWER(u.email) LIKE $2 OR LOWER(COALESCE(u.display_name, '')) LIKE $3)`;
    }
    sql += ` ORDER BY COALESCE(u.display_name, u.email) ASC LIMIT $${params.length + 1}`;
    params.push(limitNum);
    const { rows } = await query(sql, params);
    return rows;
  }

  const params = [userId];
  let sql = `
    SELECT u.id, u.email, u.display_name, u.avatar_url, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id != $1 AND u.is_active = true AND u.is_verified = true
  `;
  if (searchTerm) {
    params.push(searchTerm, searchTerm);
    sql += ` AND (LOWER(u.email) LIKE $2 OR LOWER(COALESCE(u.display_name, '')) LIKE $3)`;
  }
  sql += ` ORDER BY COALESCE(u.display_name, u.email) ASC LIMIT $${params.length + 1}`;
  params.push(limitNum);
  const { rows } = await query(sql, params);
  return rows;
};

/**
 * Direct DM allowed if the other user is active + verified (sender is verified via REST/socket middleware).
 * Admins can message any active user (handled in listEligibleUsers; for create use same rule as product).
 */
export const canMessageUser = async (userId, otherUserId, isAdmin) => {
  if (userId === otherUserId) return false;
  if (isAdmin) {
    const { rows } = await query(
      `SELECT 1 FROM users WHERE id = $1 AND is_active = true`,
      [otherUserId]
    );
    return rows.length > 0;
  }
  const { rows } = await query(
    `SELECT 1 FROM users WHERE id = $1 AND is_active = true AND is_verified = true`,
    [otherUserId]
  );
  return rows.length > 0;
};
