import { query } from '../config/db.js';
import { hashVerificationToken } from '../utils/generateToken.js';

export const create = async ({ userId, token, expiresAt }) => {
  const tokenHash = hashVerificationToken(token);
  const { rows } = await query(
    `INSERT INTO email_verification_tokens (user_id, token, token_hash, expires_at)
     VALUES ($1, NULL, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
};

export const findByToken = async (token) => {
  const tokenHash = hashVerificationToken(token);
  const { rows } = await query(
    `SELECT id, user_id, expires_at, created_at
     FROM email_verification_tokens
     WHERE (token_hash = $1 OR (token_hash IS NULL AND token = $2)) AND expires_at > NOW()`,
    [tokenHash, token]
  );
  return rows[0] || null;
};

export const deleteByUserId = async (userId) => {
  const { rowCount } = await query(
    'DELETE FROM email_verification_tokens WHERE user_id = $1',
    [userId]
  );
  return rowCount > 0;
};

export const deleteByUserIdExcept = async (userId, keepId) => {
  const { rowCount } = await query(
    'DELETE FROM email_verification_tokens WHERE user_id = $1 AND id <> $2',
    [userId, keepId]
  );
  return rowCount;
};

export const deleteById = async (id) => {
  const { rowCount } = await query(
    'DELETE FROM email_verification_tokens WHERE id = $1',
    [id]
  );
  return rowCount > 0;
};

export const deleteByToken = async (token) => {
  const tokenHash = hashVerificationToken(token);
  const { rowCount } = await query(
    'DELETE FROM email_verification_tokens WHERE token_hash = $1 OR token = $2',
    [tokenHash, token]
  );
  return rowCount > 0;
};

export const deleteExpiredTokens = async () => {
  const { rowCount } = await query(
    'DELETE FROM email_verification_tokens WHERE expires_at < NOW()'
  );
  return rowCount;
};

export const findValidByUserId = async (userId) => {
  const { rows } = await query(
    'SELECT id, user_id, expires_at FROM email_verification_tokens WHERE user_id = $1 AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1',
    [userId]
  );
  return rows[0] || null;
};
