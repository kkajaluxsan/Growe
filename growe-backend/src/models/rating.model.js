import { query } from '../config/db.js';

/**
 * Insert a tutor rating for a completed booking.
 * Fails on duplicate booking_id (UNIQUE constraint).
 */
export const create = async ({ bookingId, studentId, tutorId, rating, comment }) => {
  const { rows } = await query(
    `INSERT INTO tutor_ratings (booking_id, student_id, tutor_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, booking_id, student_id, tutor_id, rating, comment, created_at`,
    [bookingId, studentId, tutorId, rating, comment || null]
  );
  return rows[0];
};

/** Check if a rating already exists for a booking. */
export const findByBookingId = async (bookingId) => {
  const { rows } = await query(
    'SELECT id, booking_id, student_id, tutor_id, rating, comment, created_at FROM tutor_ratings WHERE booking_id = $1',
    [bookingId]
  );
  return rows[0] || null;
};

/** Average rating and count for a single tutor (by user id). */
export const getAverageByTutorId = async (tutorId) => {
  const { rows } = await query(
    `SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) as average,
            COUNT(*)::int as count
     FROM tutor_ratings WHERE tutor_id = $1`,
    [tutorId]
  );
  return rows[0] || { average: 0, count: 0 };
};

/** Batch-fetch average ratings for multiple tutor user IDs (for the tutor list). */
export const getAverageByTutorIds = async (tutorUserIds) => {
  if (!tutorUserIds?.length) return new Map();
  const { rows } = await query(
    `SELECT tutor_id,
            ROUND(AVG(rating)::numeric, 2) as average,
            COUNT(*)::int as count
     FROM tutor_ratings
     WHERE tutor_id = ANY($1::uuid[])
     GROUP BY tutor_id`,
    [tutorUserIds]
  );
  const m = new Map();
  rows.forEach((r) => m.set(r.tutor_id, { average: parseFloat(r.average), count: r.count }));
  return m;
};

/** Paginated list of ratings for a tutor, newest first. */
export const listByTutorId = async (tutorId, { limit = 20, offset = 0 } = {}) => {
  const { rows } = await query(
    `SELECT tr.id, tr.booking_id, tr.student_id, tr.tutor_id, tr.rating, tr.comment, tr.created_at,
            u.email as student_email, u.display_name as student_display_name
     FROM tutor_ratings tr
     JOIN users u ON tr.student_id = u.id
     WHERE tr.tutor_id = $1
     ORDER BY tr.created_at DESC
     LIMIT $2 OFFSET $3`,
    [tutorId, limit, offset]
  );
  return rows;
};

/** Check which bookings from a list already have ratings (for frontend "Rate" button state). */
export const findRatedBookingIds = async (bookingIds) => {
  if (!bookingIds?.length) return new Set();
  const { rows } = await query(
    'SELECT booking_id FROM tutor_ratings WHERE booking_id = ANY($1::uuid[])',
    [bookingIds]
  );
  return new Set(rows.map((r) => r.booking_id));
};
