import * as tutorModel from '../models/tutor.model.js';
import * as bookingModel from '../models/booking.model.js';
import { generateSlots } from '../utils/slotGenerator.js';
import { isPast } from '../utils/timeUtils.js';

function toDateString(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export const getAvailableSlots = async ({ tutorId, fromDate, toDate } = {}) => {
  const today = toDateString(new Date()) || new Date().toISOString().slice(0, 10);
  const defaultTo = new Date();
  defaultTo.setDate(defaultTo.getDate() + 14);
  const toStr = toDateString(toDate) || toDateString(defaultTo);

  const availabilities = await tutorModel.listAvailabilityForBooking({
    tutorId,
    fromDate: toDateString(fromDate) || today,
    toDate: toStr,
  });

  const result = [];
  for (const av of availabilities) {
    const dateStr = toDateString(av.available_date) || String(av.available_date).slice(0, 10);
    const startTime = typeof av.start_time === 'string' ? av.start_time : av.start_time?.slice(0, 8) || '00:00:00';
    const endTime = typeof av.end_time === 'string' ? av.end_time : av.end_time?.slice(0, 8) || '23:59:59';

    const slots = generateSlots({
      dateStr,
      startTime,
      endTime,
      sessionDuration: av.session_duration,
    });

    for (const slot of slots) {
      if (isPast(slot.start)) continue;

      const count = await bookingModel.countBookingsForSlot(
        av.id,
        slot.start,
        slot.end
      );
      if (count < av.max_students_per_slot) {
        result.push({
          availabilityId: av.id,
          tutorId: av.tutor_id,
          tutorEmail: av.tutor_email,
          start: slot.start,
          end: slot.end,
          date: dateStr,
        });
      }
    }
  }

  return result.sort((a, b) => new Date(a.start) - new Date(b.start));
};
