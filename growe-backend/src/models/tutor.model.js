import { query } from '../config/db.js';

export const createProfile = async ({ userId, bio, subjects = [] }) => {
  const { rows } = await query(
    `INSERT INTO tutor_profiles (user_id, bio, subjects) VALUES ($1, $2, $3)
     RETURNING id, user_id, bio, subjects, is_suspended, created_at, updated_at`,
    [userId, bio || null, subjects]
  );
  return rows[0];
};

export const findProfileByUserId = async (userId) => {
  const { rows } = await query(
    'SELECT id, user_id, bio, subjects, is_suspended, created_at, updated_at FROM tutor_profiles WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
};

export const findProfileById = async (id) => {
  const { rows } = await query(
    `SELECT tp.id, tp.user_id, tp.bio, tp.subjects, tp.is_suspended, tp.created_at, tp.updated_at, u.email
     FROM tutor_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const updateProfile = async (userId, { bio, subjects }) => {
  const updates = [];
  const params = [];
  let i = 1;
  if (bio !== undefined) { updates.push(`bio = $${i}`); params.push(bio); i++; }
  if (subjects !== undefined) { updates.push(`subjects = $${i}`); params.push(subjects); i++; }
  if (updates.length === 0) return findProfileByUserId(userId);
  updates.push(`updated_at = NOW()`);
  params.push(userId);
  const { rows } = await query(
    `UPDATE tutor_profiles SET ${updates.join(', ')} WHERE user_id = $${i}
     RETURNING id, user_id, bio, subjects, is_suspended, created_at, updated_at`,
    params
  );
  return rows[0] || null;
};

export const setSuspended = async (userId, isSuspended) => {
  const { rows } = await query(
    `UPDATE tutor_profiles SET is_suspended = $1, updated_at = NOW() WHERE user_id = $2
     RETURNING id, user_id, bio, subjects, is_suspended, created_at, updated_at`,
    [isSuspended, userId]
  );
  return rows[0] || null;
};

export const createAvailability = async ({ tutorId, availableDate, startTime, endTime, sessionDuration, isRecurring = false, maxStudentsPerSlot = 1 }) => {
  const { rows } = await query(
    `INSERT INTO tutor_availability (tutor_id, available_date, start_time, end_time, session_duration, is_recurring, max_students_per_slot)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7)
     RETURNING id, tutor_id, available_date, start_time, end_time, session_duration, is_recurring, max_students_per_slot, created_at`,
    [tutorId, availableDate, startTime, endTime, sessionDuration, isRecurring, maxStudentsPerSlot]
  );
  return rows[0];
};

export const findAvailabilityById = async (id) => {
  const { rows } = await query(
    `SELECT ta.id, ta.tutor_id, ta.available_date, ta.start_time, ta.end_time, ta.session_duration, ta.is_recurring, ta.max_students_per_slot,
            tp.user_id as tutor_user_id, tp.is_suspended
     FROM tutor_availability ta JOIN tutor_profiles tp ON ta.tutor_id = tp.id WHERE ta.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const listAvailabilityByTutor = async (tutorId, { fromDate, toDate } = {}) => {
  let sql = `SELECT id, tutor_id, available_date, start_time, end_time, session_duration, is_recurring, max_students_per_slot, created_at
             FROM tutor_availability WHERE tutor_id = $1 AND available_date::date >= CURRENT_DATE`;
  const params = [tutorId];
  let i = 2;
  if (fromDate) { sql += ` AND available_date::date >= $${i}::date`; params.push(fromDate); i++; }
  if (toDate) { sql += ` AND available_date::date <= $${i}::date`; params.push(toDate); i++; }
  sql += ' ORDER BY available_date::date, start_time';
  const { rows } = await query(sql, params);
  return rows;
};

export const listAvailabilityForBooking = async ({ tutorId, fromDate, toDate } = {}) => {
  let sql = `SELECT ta.id, ta.tutor_id, ta.available_date, ta.start_time, ta.end_time, ta.session_duration, ta.max_students_per_slot,
                    tp.user_id as tutor_user_id, u.email as tutor_email
             FROM tutor_availability ta JOIN tutor_profiles tp ON ta.tutor_id = tp.id JOIN users u ON tp.user_id = u.id
             WHERE tp.is_suspended = false AND ta.available_date::date >= CURRENT_DATE`;
  const params = [];
  let i = 1;
  if (tutorId) { sql += ` AND ta.tutor_id = $${i}`; params.push(tutorId); i++; }
  if (fromDate) { sql += ` AND ta.available_date::date >= $${i}::date`; params.push(fromDate); i++; }
  if (toDate) { sql += ` AND ta.available_date::date <= $${i}::date`; params.push(toDate); i++; }
  sql += ' ORDER BY ta.available_date::date, ta.start_time';
  const { rows } = await query(sql, params);
  return rows;
};

export const listAvailabilityForTutorsOnDate = async (dateStr) => {
  const { rows } = await query(
    `SELECT ta.id, ta.tutor_id, ta.available_date, ta.start_time, ta.end_time, ta.session_duration, ta.max_students_per_slot,
            tp.user_id as tutor_user_id, tp.bio as tutor_bio, tp.subjects as tutor_subjects,
            u.email as tutor_email, u.display_name as tutor_display_name, u.avatar_url as tutor_avatar_url
     FROM tutor_availability ta
     JOIN tutor_profiles tp ON ta.tutor_id = tp.id
     JOIN users u ON tp.user_id = u.id
     WHERE tp.is_suspended = false
       AND ta.available_date::date = $1::date
       AND ta.available_date::date >= CURRENT_DATE
     ORDER BY ta.start_time`,
    [dateStr]
  );
  return rows;
};

export const deleteAvailability = async (id, tutorId) => {
  const { rowCount } = await query('DELETE FROM tutor_availability WHERE id = $1 AND tutor_id = $2', [id, tutorId]);
  return rowCount > 0;
};

export const updateAvailability = async (
  id,
  tutorId,
  { availableDate, startTime, endTime, sessionDuration, maxStudentsPerSlot }
) => {
  const { rows } = await query(
    `UPDATE tutor_availability
     SET available_date = $3::date,
         start_time = $4,
         end_time = $5,
         session_duration = $6,
         max_students_per_slot = $7
     WHERE id = $1 AND tutor_id = $2
     RETURNING id, tutor_id, available_date, start_time, end_time, session_duration, is_recurring, max_students_per_slot, created_at`,
    [id, tutorId, availableDate, startTime, endTime, sessionDuration, maxStudentsPerSlot]
  );
  return rows[0] || null;
};

export const listTutorProfiles = async ({ limit = 50, offset = 0 } = {}) => {
  const { rows } = await query(
    `SELECT tp.id, tp.user_id, tp.bio, tp.subjects, tp.is_suspended, u.email, u.display_name, u.avatar_url
     FROM tutor_profiles tp
     JOIN users u ON tp.user_id = u.id
     WHERE tp.is_suspended = false
     ORDER BY tp.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
};

/**
 * Check for overlapping availability windows for the same tutor on the same date.
 * Used to prevent tutors from creating conflicting time windows.
 */
export const findOverlappingAvailability = async (tutorId, availableDate, startTime, endTime, excludeId = null) => {
  const sql = `
    SELECT id, available_date, start_time, end_time, session_duration
    FROM tutor_availability
    WHERE tutor_id = $1
      AND available_date::date = $2::date
      AND start_time < $4
      AND end_time > $3
      ${excludeId ? 'AND id <> $5' : ''}
    LIMIT 1
  `;
  const params = excludeId
    ? [tutorId, availableDate, startTime, endTime, excludeId]
    : [tutorId, availableDate, startTime, endTime];
  const { rows } = await query(sql, params);
  return rows[0] || null;
};
