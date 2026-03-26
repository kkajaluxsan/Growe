import { query } from '../config/db.js';
import { hashVerificationToken } from '../utils/generateToken.js';

export const create = async ({ userId, token, expiresAt }) => {
  const tokenHash = hashVerificationToken(token);
  const { rows } = await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
};

export const findByToken = async (token) => {
  const tokenHash = hashVerificationToken(token);
  const { rows } = await query(
    `SELECT id, user_id, expires_at, created_at
     FROM password_reset_tokens
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
};

export const deleteByUserId = async (userId) => {
  const { rowCount } = await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  return rowCount > 0;
};

export const deleteByToken = async (token) => {
  const tokenHash = hashVerificationToken(token);
  const { rowCount } = await query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
  return rowCount > 0;
};

export const deleteExpired = async () => {
  const { rowCount } = await query('DELETE FROM password_reset_tokens WHERE expires_at < NOW()');
  return rowCount;
};

