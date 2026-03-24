import { query } from '../config/db.js';

export const create = async ({ userId, title, description, status = 'pending', priority = 2, deadline }) => {
  const { rows } = await query(
    `INSERT INTO assignments (user_id, title, description, status, priority, deadline)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, description, status, priority, deadline, created_at, updated_at`,
    [userId, title, description, status, priority, deadline || null]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    'SELECT id, user_id, title, description, status, priority, deadline, created_at, updated_at FROM assignments WHERE id = $1',
    [id]
  );
  return rows[0] || null;
};

export const listByUser = async (userId, { status, sortBy = 'deadline', sortOrder = 'asc', limit = 50, offset = 0 } = {}) => {
  let sql = 'SELECT id, user_id, title, description, status, priority, deadline, created_at, updated_at FROM assignments WHERE user_id = $1';
  const params = [userId];
  let i = 2;
  if (status) { sql += ` AND status = $${i}`; params.push(status); i++; }
  const validSort = ['deadline', 'priority', 'created_at', 'title'];
  const sort = validSort.includes(sortBy) ? sortBy : 'deadline';
  const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${sort} ${order} NULLS LAST LIMIT $${i} OFFSET $${i + 1}`;
  params.push(limit, offset);
  const { rows } = await query(sql, params);
  return rows;
};

export const update = async (id, { title, description, status, priority, deadline }) => {
  const updates = [];
  const params = [];
  let i = 1;
  if (title !== undefined) { updates.push(`title = $${i}`); params.push(title); i++; }
  if (description !== undefined) { updates.push(`description = $${i}`); params.push(description); i++; }
  if (status !== undefined) { updates.push(`status = $${i}`); params.push(status); i++; }
  if (priority !== undefined) { updates.push(`priority = $${i}`); params.push(priority); i++; }
  if (deadline !== undefined) { updates.push(`deadline = $${i}`); params.push(deadline); i++; }
  if (updates.length === 0) return findById(id);
  updates.push(`updated_at = NOW()`);
  params.push(id);
  const { rows } = await query(
    `UPDATE assignments SET ${updates.join(', ')} WHERE id = $${i}
     RETURNING id, user_id, title, description, status, priority, deadline, created_at, updated_at`,
    params
  );
  return rows[0] || null;
};

export const deleteById = async (id) => {
  const { rowCount } = await query('DELETE FROM assignments WHERE id = $1', [id]);
  return rowCount > 0;
};
