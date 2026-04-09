import * as bookingModel from '../models/booking.model.js';
import {
  notifyBookingReminderInApp,
  notifyTutorBookingReminderInApp,
} from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

const REMINDER_HOURS_BEFORE = Number(process.env.BOOKING_REMINDER_HOURS) || 24;
const WINDOW_MINUTES = 30;

/**
 * Confirmed bookings starting in ~REMINDER_HOURS_BEFORE — student + tutor in-app + email.
 * reminder_sent_at prevents duplicates.
 */
export const runBookingReminderJob = async () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() + (REMINDER_HOURS_BEFORE * 60 - WINDOW_MINUTES) * 60 * 1000);
  const windowEnd = new Date(now.getTime() + (REMINDER_HOURS_BEFORE * 60 + WINDOW_MINUTES) * 60 * 1000);
  const bookings = await bookingModel.findDueForReminder(windowStart.toISOString(), windowEnd.toISOString());
  for (const b of bookings) {
    try {
      await notifyBookingReminderInApp({
        userId: b.student_id,
        email: b.student_email,
        startTime: b.start_time,
        tutorEmail: b.tutor_email,
      });
      if (b.tutor_user_id) {
        await notifyTutorBookingReminderInApp({
          tutorUserId: b.tutor_user_id,
          email: b.tutor_email,
          startTime: b.start_time,
          studentEmail: b.student_email,
        });
      }
      await bookingModel.markReminderSent(b.id);
    } catch (err) {
      logger.warn('booking_reminder_failed', { bookingId: b.id, err: err.message });
    }
  }
  return { processed: bookings.length };
};
