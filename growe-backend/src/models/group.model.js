import { query } from '../config/db.js';

export const create = async ({ name, description, creatorId, maxMembers = 10 }) => {
  const { rows } = await query(
    `INSERT INTO study_groups (name, description, creator_id, max_members)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, description, creator_id, max_members, created_at, updated_at`,
    [name, description, creatorId, maxMembers]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT sg.id, sg.name, sg.description, sg.creator_id, sg.max_members,
            sg.created_at, sg.updated_at, u.email as creator_email
     FROM study_groups sg
     LEFT JOIN users u ON sg.creator_id = u.id
     WHERE sg.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const update = async (id, { name, description, maxMembers }) => {
  const updates = [];
  const params = [];
  let i = 1;
  if (name !== undefined) { updates.push(`name = $${i}`); params.push(name); i++; }
  if (description !== undefined) { updates.push(`description = $${i}`); params.push(description); i++; }
  if (maxMembers !== undefined) { updates.push(`max_members = $${i}`); params.push(maxMembers); i++; }
  if (updates.length === 0) return findById(id);
  updates.push(`updated_at = NOW()`);
  params.push(id);
  const { rows } = await query(
    `UPDATE study_groups SET ${updates.join(', ')} WHERE id = $${i}
     RETURNING id, name, description, creator_id, max_members, created_at, updated_at`,
    params
  );
  return rows[0] || null;
};

export const deleteById = async (id) => {
  const { rowCount } = await query('DELETE FROM study_groups WHERE id = $1', [id]);
  return rowCount > 0;
};

export const listForUser = async (userId) => {
  const { rows } = await query(
    `SELECT sg.id, sg.name, sg.description, sg.creator_id, sg.max_members, sg.created_at, gm.status as membership_status
     FROM study_groups sg
     JOIN group_members gm ON sg.id = gm.group_id
     WHERE gm.user_id = $1 AND gm.status = 'approved'
     ORDER BY sg.created_at DESC`,
    [userId]
  );
  return rows;
};

export const addMember = async (groupId, userId, status = 'pending') => {
  const { rows } = await query(
    `INSERT INTO group_members (group_id, user_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO UPDATE SET status = $3
     RETURNING id, group_id, user_id, status, joined_at, created_at`,
    [groupId, userId, status]
  );
  return rows[0];
};

export const approveMember = async (groupId, userId) => {
  const { rows } = await query(
    `UPDATE group_members SET status = 'approved', joined_at = NOW()
     WHERE group_id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id, group_id, user_id, status, joined_at, created_at`,
    [groupId, userId]
  );
  return rows[0] || null;
};

export const rejectMember = async (groupId, userId) => {
  const { rows } = await query(
    `UPDATE group_members SET status = 'rejected'
     WHERE group_id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id, group_id, user_id, status, joined_at, created_at`,
    [groupId, userId]
  );
  return rows[0] || null;
};

export const getMember = async (groupId, userId) => {
  const { rows } = await query(
    'SELECT id, group_id, user_id, status, joined_at FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return rows[0] || null;
};

export const searchUsersNotInGroup = async (
  groupId,
  queryText,
  { limit = 10, offset = 0, searcherUserId, specialization } = {}
) => {
  const q = (queryText || '').trim();
  const spec = typeof specialization === 'string' ? specialization.trim() : '';
  if (!spec) {
    return [];
  }
  const { rows } = await query(
    `SELECT u.id, u.email, u.display_name
     FROM users u
     WHERE (u.email ILIKE $2 OR COALESCE(u.display_name, '') ILIKE $2)
       AND u.is_active = true
       AND u.is_verified = true
       AND u.specialization IS NOT NULL
       AND u.specialization = $5
       AND u.id <> $6
       AND NOT EXISTS (
         SELECT 1 FROM group_members gm WHERE gm.group_id = $1 AND gm.user_id = u.id
       )
     ORDER BY u.email
     LIMIT $3 OFFSET $4`,
    [groupId, `%${q}%`, limit, offset, spec, searcherUserId]
  );
  return rows;
};

export const listMembers = async (groupId) => {
  const { rows } = await query(
    `SELECT gm.id, gm.group_id, gm.user_id, gm.status, gm.joined_at, u.email, u.display_name
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1 ORDER BY gm.status, gm.joined_at`,
    [groupId]
  );
  return rows;
};

export const countApprovedMembers = async (groupId) => {
  const { rows } = await query(
    "SELECT COUNT(*)::int as count FROM group_members WHERE group_id = $1 AND status = 'approved'",
    [groupId]
  );
  return rows[0].count;
};
