import { query } from '../config/db.js';

const activeClause = 'deleted_at IS NULL';

export const create = async ({ userId, title, description, status = 'pending', priority = 2, deadline }) => {
  const { rows } = await query(
    `INSERT INTO assignments (user_id, title, description, status, priority, deadline)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, description, status, priority, deadline, created_at, updated_at`,
    [userId, title, description, status, priority, deadline]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT id, user_id, title, description, status, priority, deadline, created_at, updated_at
     FROM assignments WHERE id = $1 AND ${activeClause}`,
    [id]
  );
  return rows[0] || null;
};

function buildListFilters({ status, priority, deadlineAfter, deadlineBefore }, paramsStartIndex = 2) {
  const fragments = [];
  const params = [];
  let i = paramsStartIndex;
  if (status) {
    fragments.push(`AND status = $${i}`);
    params.push(status);
    i++;
  }
  if (priority !== undefined && priority !== null) {
    fragments.push(`AND priority = $${i}`);
    params.push(priority);
    i++;
  }
  if (deadlineAfter) {
    fragments.push(`AND deadline >= $${i}`);
    params.push(deadlineAfter);
    i++;
  }
  if (deadlineBefore) {
    fragments.push(`AND deadline <= $${i}`);
    params.push(deadlineBefore);
    i++;
  }
  return { fragments, params, nextIndex: i };
}

export const listByUser = async (
  userId,
  { status, priority, deadlineAfter, deadlineBefore, sortBy = 'deadline', sortOrder = 'asc', limit = 20, offset = 0 } = {}
) => {
  const { fragments, params, nextIndex } = buildListFilters({ status, priority, deadlineAfter, deadlineBefore });
  const validSort = ['deadline', 'priority', 'created_at', 'title'];
  const sort = validSort.includes(sortBy) ? sortBy : 'deadline';
  const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

  let sql = `SELECT id, user_id, title, description, status, priority, deadline, created_at, updated_at
     FROM assignments WHERE user_id = $1 AND ${activeClause}`;
  sql += ` ${fragments.join(' ')}`;
  sql += ` ORDER BY ${sort} ${order} NULLS LAST LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`;

  const allParams = [userId, ...params, limit, offset];
  const { rows } = await query(sql, allParams);
  return rows;
};

export const countByUser = async (userId, { status, priority, deadlineAfter, deadlineBefore } = {}) => {
  const { fragments, params } = buildListFilters({ status, priority, deadlineAfter, deadlineBefore });
  let sql = `SELECT COUNT(*)::int AS c FROM assignments WHERE user_id = $1 AND ${activeClause}`;
  sql += ` ${fragments.join(' ')}`;
  const { rows } = await query(sql, [userId, ...params]);
  return rows[0]?.c ?? 0;
};

export const update = async (id, { title, description, status, priority, deadline }) => {
  const updates = [];
  const params = [];
  let i = 1;
  if (title !== undefined) {
    updates.push(`title = $${i}`);
    params.push(title);
    i++;
  }
  if (description !== undefined) {
    updates.push(`description = $${i}`);
    params.push(description);
    i++;
  }
  if (status !== undefined) {
    updates.push(`status = $${i}`);
    params.push(status);
    i++;
  }
  if (priority !== undefined) {
    updates.push(`priority = $${i}`);
    params.push(priority);
    i++;
  }
  if (deadline !== undefined) {
    updates.push(`deadline = $${i}`);
    params.push(deadline);
    i++;
  }
  if (updates.length === 0) return findById(id);
  updates.push('updated_at = NOW()');
  params.push(id);
  const { rows } = await query(
    `UPDATE assignments SET ${updates.join(', ')} WHERE id = $${i} AND ${activeClause}
     RETURNING id, user_id, title, description, status, priority, deadline, created_at, updated_at`,
    params
  );
  return rows[0] || null;
};

export const softDeleteById = async (id) => {
  const { rowCount } = await query(
    `UPDATE assignments SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND ${activeClause}`,
    [id]
  );
  return rowCount > 0;
};
