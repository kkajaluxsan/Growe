import { query } from '../config/db.js';

const USER_ROW_SELECT = `u.id, u.email, u.password_hash, u.role_id, u.is_verified, u.is_active,
            u.display_name, u.avatar_url, u.provider, u.provider_id,
            u.academic_year, u.semester, u.specialization, u.index_number, u.phone_number,
            u.profile_completed,
            u.created_at, u.updated_at, r.name as role_name`;

export const create = async ({
  email,
  passwordHash,
  roleId,
  academicYear,
  semester,
  specialization,
  indexNumber,
  phoneNumber,
  displayName,
}) => {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, role_id, provider, academic_year, semester, specialization, index_number, phone_number, display_name, profile_completed)
     VALUES ($1, $2, $3, 'local', $4, $5, $6, $7, $8, $9, true)
     RETURNING id`,
    [
      email,
      passwordHash || null,
      roleId,
      academicYear,
      semester,
      specialization,
      indexNumber,
      phoneNumber,
      displayName || null,
    ]
  );
  if (!rows[0]?.id) return null;
  return findById(rows[0].id);
};

export const createGoogleUser = async ({ email, roleId, providerId, displayName }) => {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, role_id, is_verified, provider, provider_id, display_name, name)
     VALUES ($1, NULL, $2, true, 'google', $3, $4, $4)
     RETURNING id`,
    [email, roleId, providerId, displayName || null]
  );
  if (!rows[0]?.id) return null;
  return findById(rows[0].id);
};

export const linkGoogleProvider = async (userId, providerId) => {
  const { rowCount } = await query(
    `UPDATE users SET provider = 'google', provider_id = $1, is_verified = true, updated_at = NOW()
     WHERE id = $2`,
    [providerId, userId]
  );
  if (!rowCount) return null;
  return findById(userId);
};

export const findByProviderId = async (provider, providerId) => {
  const { rows } = await query(
    `SELECT ${USER_ROW_SELECT}
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.provider = $1 AND u.provider_id = $2`,
    [provider, providerId]
  );
  return rows[0] || null;
};

export const findByEmail = async (email) => {
  const { rows } = await query(
    `SELECT ${USER_ROW_SELECT}
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT ${USER_ROW_SELECT}
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
};

/** @returns {string|null} user id that owns this index, or null */
export const findIdByIndexNumber = async (indexNumber) => {
  const { rows } = await query('SELECT id FROM users WHERE index_number = $1 LIMIT 1', [indexNumber]);
  return rows[0]?.id || null;
};

export const findOtherUserIdByIndexNumber = async (indexNumber, excludeUserId) => {
  const { rows } = await query(
    'SELECT id FROM users WHERE index_number = $1 AND id <> $2 LIMIT 1',
    [indexNumber, excludeUserId]
  );
  return rows[0]?.id || null;
};

export const updatePasswordHash = async (userId, passwordHash) => {
  const { rows } = await query(
    `UPDATE users SET password_hash = $1, provider = 'local', provider_id = NULL, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, role_id, is_verified, is_active, provider, provider_id, created_at, updated_at`,
    [passwordHash, userId]
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

export const updateProfile = async (userId, {
  displayName,
  avatarUrl,
  academicYear,
  semester,
  specialization,
  indexNumber,
  phoneNumber,
  profileCompleted,
} = {}) => {
  const updates = [];
  const params = [];
  let i = 1;
  if (displayName !== undefined) {
    updates.push(`display_name = $${i}`);
    params.push(displayName || null);
    i++;
  }
  if (avatarUrl !== undefined) {
    updates.push(`avatar_url = $${i}`);
    params.push(avatarUrl || null);
    i++;
  }
  if (academicYear !== undefined) {
    updates.push(`academic_year = $${i}`);
    params.push(academicYear ?? null);
    i++;
  }
  if (semester !== undefined) {
    updates.push(`semester = $${i}`);
    params.push(semester ?? null);
    i++;
  }
  if (specialization !== undefined) {
    updates.push(`specialization = $${i}`);
    params.push(specialization || null);
    i++;
  }
  if (indexNumber !== undefined) {
    updates.push(`index_number = $${i}`);
    params.push(indexNumber || null);
    i++;
  }
  if (phoneNumber !== undefined) {
    updates.push(`phone_number = $${i}`);
    params.push(phoneNumber || null);
    i++;
  }
  if (profileCompleted !== undefined) {
    updates.push(`profile_completed = $${i}`);
    params.push(!!profileCompleted);
    i++;
  }
  if (updates.length === 0) return findById(userId);
  updates.push('updated_at = NOW()');
  params.push(userId);
  const { rowCount } = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`,
    params
  );
  if (!rowCount) return null;
  return findById(userId);
};

/**
 * Global user discovery: verified + active, exclude one user, same specialization as viewer.
 * If viewer has no specialization, returns no rows.
 */
export const searchPublicUsers = async ({ excludeUserId, q, limit = 20, offset = 0, viewerSpecialization }) => {
  const spec = typeof viewerSpecialization === 'string' ? viewerSpecialization.trim() : '';
  if (!spec) {
    return [];
  }
  const term = `%${String(q).trim().toLowerCase()}%`;
  const { rows } = await query(
    `SELECT u.id, u.email, u.display_name, u.avatar_url
     FROM users u
     WHERE u.id <> $1
       AND u.is_verified = true
       AND u.is_active = true
       AND u.specialization IS NOT NULL
       AND u.specialization = $5
       AND (
         LOWER(u.email) LIKE $2
         OR LOWER(COALESCE(u.display_name, '')) LIKE $2
       )
     ORDER BY u.email ASC
     LIMIT $3 OFFSET $4`,
    [excludeUserId, term, limit, offset, spec]
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.display_name || null,
    avatar_url: r.avatar_url || null,
  }));
};

export const listAll = async ({ limit = 50, offset = 0, roleName, isVerified, isActive } = {}) => {
  let sql = `
    SELECT u.id, u.email, u.role_id, u.is_verified, u.is_active,
           u.display_name, u.avatar_url, u.academic_year, u.semester, u.specialization, u.index_number, u.phone_number,
           u.profile_completed, u.provider,
           u.created_at, u.updated_at, r.name as role_name
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
