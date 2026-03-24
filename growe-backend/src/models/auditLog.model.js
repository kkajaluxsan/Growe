import { query } from '../config/db.js';

export const create = async ({ actorId, action, resourceType, resourceId, details, ipAddress }) => {
  const { rows } = await query(
    `INSERT INTO audit_log (actor_id, action, resource_type, resource_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, actor_id, action, resource_type, resource_id, details, created_at`,
    [actorId ?? null, action, resourceType ?? null, resourceId ?? null, details ? JSON.stringify(details) : null, ipAddress ?? null]
  );
  return rows[0];
};

export const list = async ({ limit = 50, offset = 0, actorId, action } = {}) => {
  let sql = 'SELECT id, actor_id, action, resource_type, resource_id, details, ip_address, created_at FROM audit_log WHERE 1=1';
  const params = [];
  let i = 1;
  if (actorId) { sql += ` AND actor_id = $${i}`; params.push(actorId); i++; }
  if (action) { sql += ` AND action = $${i}`; params.push(action); i++; }
  sql += ` ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`;
  params.push(limit, offset);
  const { rows } = await query(sql, params);
  return rows;
};
