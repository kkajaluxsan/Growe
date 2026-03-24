import { query } from '../config/db.js';

export const create = async ({ email, passwordHash, roleId }) => {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, role_id)
     VALUES ($1, $2, $3)
     RETURNING id, email, role_id, is_verified, is_active, created_at, updated_at`,
    [email, passwordHash, roleId]
  );
  return rows[0];
};

export const findByEmail = async (email) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.password_hash, u.role_id, u.is_verified, u.is_active,
            u.display_name, u.avatar_url, u.created_at, u.updated_at, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.role_id, u.is_verified, u.is_active,
            u.display_name, u.avatar_url, u.created_at, u.updated_at, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const updateVerification = async (userId, isVerified) => {
  const { rows } = await query(
    `UPDATE users SET is_verified = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, role_id, is_verified, is_active, created_at, updated_at`,
    [isVerified, userId]
  );
  return rows[0] || null;
};

export const updateActive = async (userId, isActive) => {
  const { rows } = await query(
    `UPDATE users SET is_active = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, role_id, is_verified, is_active, created_at, updated_at`,
    [isActive, userId]
  );
  return rows[0] || null;
};

export const updateRole = async (userId, roleId) => {
  const { rows } = await query(
    `UPDATE users SET role_id = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, role_id, is_verified, is_active, created_at, updated_at`,
    [roleId, userId]
  );
  return rows[0] || null;
};

export const deleteById = async (id) => {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  return rowCount > 0;
};

export const updateProfile = async (userId, { displayName, avatarUrl }) => {
  const updates = [];
  const params = [];
  let i = 1;
  if (displayName !== undefined) { updates.push(`display_name = $${i}`); params.push(displayName || null); i++; }
  if (avatarUrl !== undefined) { updates.push(`avatar_url = $${i}`); params.push(avatarUrl || null); i++; }
  if (updates.length === 0) return findById(userId);
  updates.push('updated_at = NOW()');
  params.push(userId);
  const { rows } = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, display_name, avatar_url, role_id, is_verified, is_active, created_at, updated_at`,
    params
  );
  return rows[0] || null;
};

export const listAll = async ({ limit = 50, offset = 0, roleName, isVerified, isActive } = {}) => {
  let sql = `
    SELECT u.id, u.email, u.role_id, u.is_verified, u.is_active,
           u.display_name, u.avatar_url, u.created_at, u.updated_at, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE 1=1
  `;
  const params = [];
  let i = 1;
  if (roleName) { sql += ` AND r.name = $${i}`; params.push(roleName); i++; }
  if (isVerified !== undefined) { sql += ` AND u.is_verified = $${i}`; params.push(isVerified); i++; }
  if (isActive !== undefined) { sql += ` AND u.is_active = $${i}`; params.push(isActive); i++; }
  sql += ` ORDER BY u.created_at DESC LIMIT $${i} OFFSET $${i + 1}`;
  params.push(limit, offset);
  const { rows } = await query(sql, params);
  return rows;
};
