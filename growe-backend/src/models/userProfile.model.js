import { query } from '../config/db.js';

export const getByUserId = async (userId) => {
  const { rows } = await query(
    'SELECT user_id, phone, bio, updated_at FROM user_profiles WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
};

export const upsert = async ({ userId, phone, bio }) => {
  const { rows } = await query(
    `INSERT INTO user_profiles (user_id, phone, bio, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
       bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
       updated_at = NOW()
     RETURNING user_id, phone, bio, updated_at`,
    [userId, phone || null, bio || null]
  );
  return rows[0];
};
