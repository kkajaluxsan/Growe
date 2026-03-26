import { transaction } from '../config/db.js';
import * as tutorModel from '../models/tutor.model.js';
import * as bookingModel from '../models/booking.model.js';
import { doTimesOverlap, isPast } from '../utils/timeUtils.js';
import { generateSlots } from '../utils/slotGenerator.js';

const VALID_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const CANCELLATION_WINDOW_HOURS = 24;
const MAX_CANCELLATIONS_PER_DAYS = 30;
const MAX_CANCELLATIONS_IN_PERIOD = 3;

function toLocalDateString(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const createBooking = async ({ availabilityId, studentId, startTime, endTime }) => {
  const availability = await tutorModel.findAvailabilityById(availabilityId);
  if (!availability) {
    const err = new Error('Availability not found');
    err.statusCode = 404;
    throw err;
  }

  if (availability.is_suspended) {
    const err = new Error('Tutor is suspended');
    err.statusCode = 403;
    throw err;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isPast(start)) {
    const err = new Error('Cannot book past time slots');
    err.statusCode = 400;
    throw err;
  }

  const dateStr = availability.available_date;
  const dateStrFixed = toLocalDateString(dateStr);
  if (!dateStrFixed) {
    const err = new Error('Invalid availability date');
    err.statusCode = 500;
    throw err;
  }
  const st = typeof availability.start_time === 'string' ? availability.start_time : availability.start_time?.slice(0, 8);
  const et = typeof availability.end_time === 'string' ? availability.end_time : availability.end_time?.slice(0, 8);

  const validSlots = generateSlots({
    dateStr: dateStrFixed,
    startTime: st,
    endTime: et,
    sessionDuration: availability.session_duration,
  });

  const slotValid = validSlots.some(
    (s) => s.start === start.toISOString() && s.end === end.toISOString()
  );
  if (!slotValid) {
    const err = new Error('Invalid or unavailable time slot');
    err.statusCode = 400;
    throw err;
  }

  return transaction(async (client) => {
    // If max_students_per_slot > 1, multiple students can book the same slot up to capacity.
    // We rely on the locked count check below to enforce capacity.

    const overlapStudent = await client.query(
      `SELECT id FROM bookings
       WHERE student_id = $1 AND status NOT IN ('cancelled')
         AND start_time < $3 AND end_time > $2
       FOR UPDATE`,
      [studentId, startTime, endTime]
    );
    if (overlapStudent.rows.length > 0) {
      const err = new Error('You have an overlapping booking');
      err.statusCode = 409;
      throw err;
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int as count FROM bookings
       WHERE availability_id = $1 AND status NOT IN ('cancelled')
         AND start_time < $3 AND end_time > $2`,
      [availabilityId, startTime, endTime]
    );
    if (countResult.rows[0].count >= availability.max_students_per_slot) {
      const err = new Error('Slot is full');
      err.statusCode = 409;
      throw err;
    }

    const { rows } = await client.query(
      `INSERT INTO bookings (availability_id, student_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, availability_id, student_id, start_time, end_time, status, reliability_score, created_at, updated_at`,
      [availabilityId, studentId, startTime, endTime]
    );
    return rows[0];
  });
};

export const updateBookingStatus = async (bookingId, newStatus, actorRole) => {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const allowed = VALID_STATUS_TRANSITIONS[booking.status];
  if (!allowed || !allowed.includes(newStatus)) {
    const err = new Error(`Cannot transition from ${booking.status} to ${newStatus}`);
    err.statusCode = 400;
    throw err;
  }

  if (newStatus === 'cancelled' && (actorRole || 'student') === 'student') {
    const start = new Date(booking.start_time);
    const now = new Date();
    const hoursUntil = (start - now) / (60 * 60 * 1000);
    if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
      const err = new Error(`Cancellation is not allowed within ${CANCELLATION_WINDOW_HOURS} hours of the session start.`);
      err.statusCode = 400;
      err.code = 'CANCELLATION_WINDOW';
      throw err;
    }
    const since = new Date(now);
    since.setDate(since.getDate() - MAX_CANCELLATIONS_PER_DAYS);
    const cancelCount = await bookingModel.countCancellationsByStudentSince(booking.student_id, since);
    if (cancelCount >= MAX_CANCELLATIONS_IN_PERIOD) {
      const err = new Error(`You have reached the maximum of ${MAX_CANCELLATIONS_IN_PERIOD} cancellations per ${MAX_CANCELLATIONS_PER_DAYS} days.`);
      err.statusCode = 400;
      err.code = 'MAX_CANCELLATIONS';
      throw err;
    }
  }

  const reliabilityScore = newStatus === 'completed' ? 1.0 : newStatus === 'no_show' ? 0 : null;
  const updated = await bookingModel.updateStatus(bookingId, newStatus, reliabilityScore);
  return updated;
};
