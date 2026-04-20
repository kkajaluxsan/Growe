import { query } from '../config/db.js';

export const create = async ({ availabilityId, studentId, startTime, endTime }) => {
  const { rows } = await query(
    `INSERT INTO bookings (availability_id, student_id, start_time, end_time, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id, availability_id, student_id, start_time, end_time, status, reliability_score, created_at, updated_at`,
    [availabilityId, studentId, startTime, endTime]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await query(
    `SELECT b.id, b.availability_id, b.student_id, b.start_time, b.end_time, b.status, b.reliability_score, b.created_at, b.updated_at,
            ta.tutor_id, ta.available_date, ta.session_duration, tp.user_id as tutor_user_id
     FROM bookings b JOIN tutor_availability ta ON b.availability_id = ta.id JOIN tutor_profiles tp ON ta.tutor_id = tp.id
     WHERE b.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const listByStudent = async (studentId, { status, limit = 50, offset = 0, filterPast = true } = {}) => {
  let sql = `SELECT b.id, b.availability_id, b.student_id, b.start_time, b.end_time, b.status, b.reliability_score, b.created_at,
                   ta.tutor_id, ta.available_date, ta.session_duration, tp.user_id as tutor_user_id, u.email as tutor_email
            FROM bookings b JOIN tutor_availability ta ON b.availability_id = ta.id JOIN tutor_profiles tp ON ta.tutor_id = tp.id JOIN users u ON tp.user_id = u.id
            WHERE b.student_id = $1`;
  const params = [studentId];
  let i = 2;
  if (status) { sql += ` AND b.status = $${i}`; params.push(status); i++; }
  if (filterPast) { sql += ' AND b.start_time >= CURRENT_TIMESTAMP'; }
  sql += ` ORDER BY b.start_time DESC LIMIT $${i} OFFSET $${i + 1}`;
  params.push(limit, offset);
  const { rows } = await query(sql, params);
  return rows;
};

export const listByTutor = async (tutorUserId, { status, limit = 50, offset = 0, filterPast = true } = {}) => {
  let sql = `SELECT b.id, b.availability_id, b.student_id, b.start_time, b.end_time, b.status, b.reliability_score, b.created_at,
                   ta.tutor_id, ta.available_date, ta.session_duration, u.email as student_email
            FROM bookings b JOIN tutor_availability ta ON b.availability_id = ta.id JOIN tutor_profiles tp ON ta.tutor_id = tp.id JOIN users u ON b.student_id = u.id
            WHERE tp.user_id = $1`;
  const params = [tutorUserId];
  let i = 2;
  if (status) { sql += ` AND b.status = $${i}`; params.push(status); i++; }
  if (filterPast) { sql += ' AND b.start_time >= CURRENT_TIMESTAMP'; }
  sql += ` ORDER BY b.start_time DESC LIMIT $${i} OFFSET $${i + 1}`;
  params.push(limit, offset);
  const { rows } = await query(sql, params);
  return rows;
};

export const listAllForAdmin = async ({ limit = 100, offset = 0 } = {}) => {
  const { rows } = await query(
    `SELECT b.id, b.availability_id, b.student_id, b.start_time, b.end_time, b.status, b.reliability_score, b.created_at,
            su.email as student_email, tu.email as tutor_email
     FROM bookings b JOIN users su ON b.student_id = su.id
     JOIN tutor_availability ta ON b.availability_id = ta.id JOIN tutor_profiles tp ON ta.tutor_id = tp.id JOIN users tu ON tp.user_id = tu.id
     ORDER BY b.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
};

export const updateStatus = async (id, status, reliabilityScore = null) => {
  if (reliabilityScore !== null) {
    const { rows } = await query(
      `UPDATE bookings SET status = $1, reliability_score = $2, updated_at = NOW() WHERE id = $3
       RETURNING id, availability_id, student_id, start_time, end_time, status, reliability_score, created_at, updated_at`,
      [status, reliabilityScore, id]
    );
    return rows[0] || null;
  }
  const { rows } = await query(
    `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, availability_id, student_id, start_time, end_time, status, reliability_score, created_at, updated_at`,
    [status, id]
  );
  return rows[0] || null;
};

export const getReliabilityByStudentId = async (studentId) => {
  const { rows } = await query(
    `SELECT COALESCE(ROUND(AVG(reliability_score)::numeric, 2), 0) as score,
            COUNT(*)::int as total
     FROM bookings WHERE student_id = $1 AND status IN ('completed', 'no_show') AND reliability_score IS NOT NULL`,
    [studentId]
  );
  return rows[0] || { score: 0, total: 0 };
};

export const getReliabilityRanking = async ({ limit = 50 } = {}) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.display_name,
            ROUND(AVG(b.reliability_score)::numeric, 2) as score,
            COUNT(*)::int as total
     FROM users u
     JOIN bookings b ON b.student_id = u.id AND b.status IN ('completed', 'no_show') AND b.reliability_score IS NOT NULL
     GROUP BY u.id, u.email, u.display_name
     ORDER BY score DESC, total DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
};

export const findDueForReminder = async (windowStart, windowEnd) => {
  const { rows } = await query(
    `SELECT b.id, b.student_id, b.start_time, u.email as student_email, tu.email as tutor_email,
            tp.user_id as tutor_user_id
     FROM bookings b
     JOIN users u ON b.student_id = u.id
     JOIN tutor_availability ta ON b.availability_id = ta.id
     JOIN tutor_profiles tp ON ta.tutor_id = tp.id
     JOIN users tu ON tp.user_id = tu.id
     WHERE b.status = 'confirmed' AND b.reminder_sent_at IS NULL
       AND b.start_time >= $1 AND b.start_time <= $2`,
    [windowStart, windowEnd]
  );
  return rows;
};

/** Confirmed bookings starting in [windowStart, windowEnd] — for "session starting soon" (e.g. 10 min). */
export const findDueForImminentReminder = async (windowStart, windowEnd) => {
  const { rows } = await query(
    `SELECT b.id, b.student_id, b.start_time, u.email as student_email, tu.email as tutor_email,
            tp.user_id as tutor_user_id
     FROM bookings b
     JOIN users u ON b.student_id = u.id
     JOIN tutor_availability ta ON b.availability_id = ta.id
     JOIN tutor_profiles tp ON ta.tutor_id = tp.id
     JOIN users tu ON tp.user_id = tu.id
     WHERE b.status = 'confirmed' AND b.imminent_reminder_sent_at IS NULL
       AND b.start_time >= $1 AND b.start_time <= $2`,
    [windowStart, windowEnd]
  );
  return rows;
};

export const markReminderSent = async (bookingId) => {
  const { rows } = await query(
    `UPDATE bookings SET reminder_sent_at = NOW() WHERE id = $1 RETURNING id`,
    [bookingId]
  );
  return rows[0] || null;
};

export const markImminentReminderSent = async (bookingId) => {
  const { rows } = await query(
    `UPDATE bookings SET imminent_reminder_sent_at = NOW() WHERE id = $1 RETURNING id`,
    [bookingId]
  );
  return rows[0] || null;
};

export const countCancellationsByStudentSince = async (studentId, since) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int as count FROM bookings
     WHERE student_id = $1 AND status = 'cancelled' AND updated_at >= $2`,
    [studentId, since]
  );
  return rows[0].count;
};

export const countBookingsForSlot = async (availabilityId, startTime, endTime) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int as count FROM bookings
     WHERE availability_id = $1 AND status NOT IN ('cancelled') AND start_time < $3 AND end_time > $2`,
    [availabilityId, startTime, endTime]
  );
  return rows[0].count;
};

export const hasStudentOverlapForSlot = async (studentId, startTime, endTime) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int as count FROM bookings
     WHERE student_id = $1 AND status NOT IN ('cancelled') AND start_time < $3 AND end_time > $2`,
    [studentId, startTime, endTime]
  );
  return rows[0].count > 0;
};

/**
 * Count overlapping bookings for a tutor across ALL availability rows, excluding one availability if needed.
 * Used to avoid double-booking the same tutor through overlapping availability records.
 */
export const countTutorOverlapsForSlot = async ({ tutorId, startTime, endTime, excludeAvailabilityId = null }) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int as count
     FROM bookings b
     JOIN tutor_availability ta ON b.availability_id = ta.id
     WHERE ta.tutor_id = $1
       AND b.status NOT IN ('cancelled', 'rejected')
       AND b.start_time < $3
       AND b.end_time > $2
       AND ($4::uuid IS NULL OR b.availability_id <> $4)`,
    [tutorId, startTime, endTime, excludeAvailabilityId]
  );
  return rows[0].count;
>>>>>>> a03196e0cfa4176d962c3660f8fbe56e87112d7b
};

/** Completed sessions per tutor profile (for tutor selection UX). */
export const countCompletedSessionsByTutorIds = async (tutorProfileIds) => {
  if (!tutorProfileIds?.length) return new Map();
  const { rows } = await query(
    `SELECT ta.tutor_id, COUNT(*)::int as completed_count
     FROM bookings b
     JOIN tutor_availability ta ON b.availability_id = ta.id
     WHERE ta.tutor_id = ANY($1::uuid[]) AND b.status = 'completed'
     GROUP BY ta.tutor_id`,
    [tutorProfileIds]
  );
  const m = new Map();
  rows.forEach((r) => m.set(r.tutor_id, r.completed_count));
  return m;
};
