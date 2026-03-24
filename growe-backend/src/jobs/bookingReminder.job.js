import * as bookingModel from '../models/booking.model.js';
import { sendBookingReminder } from '../services/email.service.js';

const REMINDER_HOURS_BEFORE = Number(process.env.BOOKING_REMINDER_HOURS) || 24;
const WINDOW_MINUTES = 30;

/**
 * Find confirmed bookings starting in ~REMINDER_HOURS_BEFORE and send reminder email.
 * Run this on a schedule (e.g. every 15–30 min). Safe to run repeatedly; reminder_sent_at prevents duplicates.
 */
export const runBookingReminderJob = async () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() + (REMINDER_HOURS_BEFORE * 60 - WINDOW_MINUTES) * 60 * 1000);
  const windowEnd = new Date(now.getTime() + (REMINDER_HOURS_BEFORE * 60 + WINDOW_MINUTES) * 60 * 1000);
  const bookings = await bookingModel.findDueForReminder(windowStart.toISOString(), windowEnd.toISOString());
  for (const b of bookings) {
    try {
      await sendBookingReminder({
        email: b.student_email,
        startTime: b.start_time,
        tutorEmail: b.tutor_email,
      });
      await bookingModel.markReminderSent(b.id);
    } catch (err) {
      console.error(`Booking reminder failed for booking ${b.id}:`, err.message);
    }
  }
  return { processed: bookings.length };
};
