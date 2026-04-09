import * as bookingModel from '../models/booking.model.js';
import { notifyBookingImminentInApp } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

/** Minutes before start to fire the “starting soon” alert (Teams-style). */
const IMMINENT_MINUTES = Number(process.env.BOOKING_IMMINENT_MINUTES) || 10;
/** Match bookings in a narrow window so a 60s tick still catches them once. */
const WINDOW_HALF_MINUTES = 1.5;

/**
 * Confirmed sessions starting in ~IMMINENT_MINUTES — in-app + socket for student and tutor.
 * imminent_reminder_sent_at dedupes.
 */
export const runBookingImminentReminderJob = async () => {
  const now = new Date();
  const msBefore = IMMINENT_MINUTES * 60 * 1000;
  const windowStart = new Date(now.getTime() + msBefore - WINDOW_HALF_MINUTES * 60 * 1000);
  const windowEnd = new Date(now.getTime() + msBefore + WINDOW_HALF_MINUTES * 60 * 1000);
  const bookings = await bookingModel.findDueForImminentReminder(
    windowStart.toISOString(),
    windowEnd.toISOString()
  );
  for (const b of bookings) {
    try {
      await notifyBookingImminentInApp({
        userId: b.student_id,
        startTime: b.start_time,
        role: 'student',
        otherPartyEmail: b.tutor_email,
        bookingId: b.id,
      });
      if (b.tutor_user_id) {
        await notifyBookingImminentInApp({
          userId: b.tutor_user_id,
          startTime: b.start_time,
          role: 'tutor',
          otherPartyEmail: b.student_email,
          bookingId: b.id,
        });
      }
      await bookingModel.markImminentReminderSent(b.id);
    } catch (err) {
      logger.warn('booking_imminent_reminder_failed', { bookingId: b.id, err: err.message });
    }
  }
  return { processed: bookings.length };
};
