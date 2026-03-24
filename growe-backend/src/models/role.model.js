import { query } from '../config/db.js';

export const findByName = async (name) => {
  const { rows } = await query(
    'SELECT id, name, created_at, updated_at FROM roles WHERE name = $1',
    [name]
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const { rows } = await query(
    'SELECT id, name, created_at, updated_at FROM roles WHERE id = $1',
    [id]
  );
  return rows[0] || null;
};
