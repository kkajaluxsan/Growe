import { query } from '../config/db.js';
import { hashVerificationToken } from '../utils/generateToken.js';

export const create = async ({ groupId, createdBy, token, expiresAt, maxUses = 0 }) => {
  const tokenHash = hashVerificationToken(token);
  const { rows } = await query(
    `INSERT INTO group_invites (group_id, created_by, token_hash, expires_at, max_uses)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, group_id, created_by, expires_at, max_uses, uses_count, revoked, created_at`,
    [groupId, createdBy, tokenHash, expiresAt, maxUses]
  );
  return rows[0];
};

export const findValidByToken = async (token) => {
  const tokenHash = hashVerificationToken(token);
  const { rows } = await query(
    `SELECT id, group_id, created_by, expires_at, max_uses, uses_count, revoked
     FROM group_invites
     WHERE token_hash = $1`,
    [tokenHash]
  );
  const invite = rows[0] || null;
  if (!invite) return null;
  if (invite.revoked) return null;
  if (new Date(invite.expires_at).getTime() < Date.now()) return null;
  if (invite.max_uses > 0 && invite.uses_count >= invite.max_uses) return null;
  return invite;
};

export const incrementUse = async (id) => {
  const { rows } = await query(
    `UPDATE group_invites SET uses_count = uses_count + 1
     WHERE id = $1
     RETURNING id, uses_count`,
    [id]
  );
  return rows[0] || null;
};

