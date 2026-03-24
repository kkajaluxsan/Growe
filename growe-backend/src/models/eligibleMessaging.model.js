import { query } from '../config/db.js';

/**
 * Users the current user is allowed to message:
 * - Same study group (both approved members)
 * - Confirmed/completed booking (student–tutor)
 * - Or current user is admin (can message any active user)
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
  let paramIndex = 2;
  const conditions = [
    `u.is_active = true`,
    `u.id != $1`,
    `(
      EXISTS (
        SELECT 1 FROM group_members g1
        JOIN group_members g2 ON g1.group_id = g2.group_id AND g2.user_id = u.id AND g2.status = 'approved'
        WHERE g1.user_id = $1 AND g1.status = 'approved'
      )
      OR EXISTS (
        SELECT 1 FROM bookings b
        JOIN tutor_availability ta ON b.availability_id = ta.id
        JOIN tutor_profiles tp ON ta.tutor_id = tp.id
        WHERE b.status IN ('confirmed', 'completed')
          AND ((b.student_id = $1 AND tp.user_id = u.id) OR (b.student_id = u.id AND tp.user_id = $1))
      )
    )`,
  ];
  if (searchTerm) {
    conditions.push(`(LOWER(u.email) LIKE $${paramIndex} OR LOWER(COALESCE(u.display_name, '')) LIKE $${paramIndex + 1})`);
    params.push(searchTerm, searchTerm);
    paramIndex += 2;
  }
  params.push(limitNum);
  const sql = `
    SELECT DISTINCT u.id, u.email, u.display_name, u.avatar_url, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY COALESCE(u.display_name, u.email) ASC
    LIMIT $${params.length}
  `;
  const { rows } = await query(sql, params);
  return rows;
};

/**
 * Returns true if the current user is allowed to start a direct conversation with the other user.
 */
export const canMessageUser = async (userId, otherUserId, isAdmin) => {
  if (userId === otherUserId) return false;
  if (isAdmin) return true;
  const { rows } = await query(
    `SELECT 1
     FROM users u
     WHERE u.id = $2 AND u.is_active = true
       AND (
         EXISTS (
           SELECT 1 FROM group_members g1
           JOIN group_members g2 ON g1.group_id = g2.group_id AND g2.user_id = u.id AND g2.status = 'approved'
           WHERE g1.user_id = $1 AND g1.status = 'approved'
         )
         OR EXISTS (
           SELECT 1 FROM bookings b
           JOIN tutor_availability ta ON b.availability_id = ta.id
           JOIN tutor_profiles tp ON ta.tutor_id = tp.id
           WHERE b.status IN ('confirmed', 'completed')
             AND ((b.student_id = $1 AND tp.user_id = u.id) OR (b.student_id = u.id AND tp.user_id = $1))
         )
       )`,
    [userId, otherUserId]
  );
  return rows.length > 0;
};
