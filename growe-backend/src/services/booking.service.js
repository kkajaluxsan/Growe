import { transaction } from '../config/db.js';
import * as bookingModel from '../models/booking.model.js';
import * as notificationService from './notification.service.js';
import { doTimesOverlap, isPast } from '../utils/timeUtils.js';
import { generateSlots } from '../utils/slotGenerator.js';

const VALID_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled', 'rejected', 'waiting_tutor_confirmation'],
  waiting_tutor_confirmation: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  rejected: [],
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
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isPast(start)) {
    const err = new Error('Cannot book past time slots');
    err.statusCode = 400;
    throw err;
  }

  return transaction(async (client) => {
    const availabilityResult = await client.query(
      `SELECT ta.id, ta.tutor_id, ta.available_date, ta.start_time, ta.end_time, ta.session_duration, ta.max_students_per_slot,
              tp.is_suspended
       FROM tutor_availability ta
       JOIN tutor_profiles tp ON ta.tutor_id = tp.id
       WHERE ta.id = $1
       FOR UPDATE`,
      [availabilityId]
    );
    const availability = availabilityResult.rows[0];
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

    const dateStrFixed = toLocalDateString(availability.available_date);
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

    // If max_students_per_slot > 1, multiple students can book the same slot up to capacity.
    // The availability row lock above serializes concurrent bookings for the same slot.

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

    const overlapTutor = await client.query(
      `SELECT b.id
       FROM bookings b
       JOIN tutor_availability ta ON b.availability_id = ta.id
       WHERE ta.tutor_id = $1
         AND b.availability_id <> $2
         AND b.status NOT IN ('cancelled', 'rejected')
         AND b.start_time < $4 AND b.end_time > $3
       FOR UPDATE`,
      [availability.tutor_id, availabilityId, startTime, endTime]
    );
    if (overlapTutor.rows.length > 0) {
      const err = new Error('Tutor is unavailable for the selected time');
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
  }).then(async (booking) => {
    const full = await bookingModel.findById(booking.id);
    if (full) {
      Promise.resolve()
        .then(() => notificationService.notifyBookingCreated(full))
        .catch(() => {});
    }
    return booking;
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

  if ((newStatus === 'completed' || newStatus === 'no_show') && (actorRole || 'student') === 'tutor') {
    const start = new Date(booking.start_time);
    if (start.getTime() > Date.now()) {
      const err = new Error('This session has not started yet. You can mark Complete or No-Show only after start time.');
      err.statusCode = 400;
      err.code = 'SESSION_NOT_STARTED';
      throw err;
    }
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
  const full = await bookingModel.findById(bookingId);
  if (full) {
    Promise.resolve()
      .then(() => notificationService.notifyBookingStatusChanged(full, newStatus))
      .catch(() => {});

    // Prompt the student to rate the tutor after a completed session
    if (newStatus === 'completed') {
      Promise.resolve()
        .then(async () => {
          const tutorUser = await (await import('../models/user.model.js')).findById(full.tutor_user_id);
          return notificationService.notifyRatingPrompt({
            studentUserId: full.student_id,
            tutorEmail: tutorUser?.email,
            bookingId: full.id,
          });
        })
        .catch(() => {});
    }
  }
  return updated;
};
