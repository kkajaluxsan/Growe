import { query } from '../config/db.js';
import { hashVerificationToken } from '../utils/generateToken.js';

export const create = async ({ userId, token, expiresAt, replacedBy = null }) => {
  const tokenHash = hashVerificationToken(token);
  const { rows } = await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, replaced_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, expires_at, revoked, created_at`,
    [userId, tokenHash, expiresAt, replacedBy]
  );
  return rows[0];
};

export const findValidByToken = async (token) => {
  const tokenHash = hashVerificationToken(token);
  const { rows } = await query(
    `SELECT id, user_id, expires_at, revoked, replaced_by
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );
  const rec = rows[0] || null;
  if (!rec) return null;
  if (rec.revoked) return null;
  if (new Date(rec.expires_at).getTime() < Date.now()) return null;
  return rec;
};

export const revoke = async (id) => {
  const { rowCount } = await query(
    `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW()
     WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
};

export const revokeByUserId = async (userId) => {
  const { rowCount } = await query(
    `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW()
     WHERE user_id = $1 AND revoked = false`,
    [userId]
  );
  return rowCount;
};

