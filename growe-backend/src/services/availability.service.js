import * as tutorModel from '../models/tutor.model.js';
import * as bookingModel from '../models/booking.model.js';
import * as userModel from '../models/user.model.js';
import { generateSlots } from '../utils/slotGenerator.js';
import { isPast, parseYYYYMMDDLocal, startOfLocalDay } from '../utils/timeUtils.js';
import * as groupModel from '../models/group.model.js';

function toDateString(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  // Use local date parts to avoid timezone shifting (DATE columns should be timezone-free).
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const getAvailableSlots = async ({ tutorId, fromDate, toDate } = {}) => {
  const today = toDateString(new Date()) || new Date().toISOString().slice(0, 10);
  const defaultTo = new Date();
  defaultTo.setDate(defaultTo.getDate() + 14);
  const toStr = toDateString(toDate) || toDateString(defaultTo);

  const fromStr = toDateString(fromDate) || today;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromStr) && fromStr < today) {
    const err = new Error('fromDate cannot be in the past');
    err.statusCode = 400;
    throw err;
  }

  const availabilities = await tutorModel.listAvailabilityForBooking({
    tutorId,
    fromDate: fromStr,
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
      const tutorOverlapCount = await bookingModel.countTutorOverlapsForSlot({
        tutorId: av.tutor_id,
        startTime: slot.start,
        endTime: slot.end,
        excludeAvailabilityId: av.id,
      });
      if (tutorOverlapCount > 0) continue;
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

export const getAvailableTutorsByDate = async ({ date, groupId, userId }) => {
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const err = new Error('date (YYYY-MM-DD) is required');
    err.statusCode = 400;
    throw err;
  }
  const day = parseYYYYMMDDLocal(date);
  if (!day || day.getTime() < startOfLocalDay().getTime()) {
    const err = new Error('date cannot be in the past');
    err.statusCode = 400;
    throw err;
  }
  if (!groupId) {
    const err = new Error('groupId is required');
    err.statusCode = 400;
    throw err;
  }

  const member = await groupModel.getMember(groupId, userId);
  if (!member || member.status !== 'approved') {
    const err = new Error('You must be an approved member of this group');
    err.statusCode = 403;
    throw err;
  }

  const viewer = await userModel.findById(userId);
  const specialization = viewer?.specialization ? String(viewer.specialization).trim() : '';
  const availabilities = await tutorModel.listAvailabilityForTutorsOnDate(date, { specialization });

  const byTutor = new Map();

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

      const count = await bookingModel.countBookingsForSlot(av.id, slot.start, slot.end);
      const tutorOverlapCount = await bookingModel.countTutorOverlapsForSlot({
        tutorId: av.tutor_id,
        startTime: slot.start,
        endTime: slot.end,
        excludeAvailabilityId: av.id,
      });
      if (tutorOverlapCount > 0) continue;
      if (count >= av.max_students_per_slot) continue;

      if (!byTutor.has(av.tutor_id)) {
        byTutor.set(av.tutor_id, {
          tutorId: av.tutor_id,
          email: av.tutor_email,
          bio: av.tutor_bio || null,
          subjects: Array.isArray(av.tutor_subjects) ? av.tutor_subjects : [],
          slots: [],
        });
      }
      byTutor.get(av.tutor_id).slots.push({
        availabilityId: av.id,
        startTime: slot.start,
        endTime: slot.end,
      });
    }
  }

  return Array.from(byTutor.values()).map((t) => ({
    ...t,
    slots: t.slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
  }));
};

function subjectMatches(subjects, needle) {
  if (!needle || !needle.trim()) return false;
  const n = needle.trim().toLowerCase();
  const arr = Array.isArray(subjects) ? subjects : [];
  return arr.some((s) => typeof s === 'string' && s.toLowerCase().includes(n));
}

function tutorSearchMatches(t, q) {
  if (!q || !q.trim()) return true;
  const n = q.trim().toLowerCase();
  const parts = [
    t.displayName,
    t.email,
    t.bio,
    ...(Array.isArray(t.subjects) ? t.subjects : []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return parts.some((p) => p.includes(n));
}

/**
 * Tutors with a free slot exactly matching [startISO, endISO] on the same calendar day.
 * Optional `subject` boosts sort order; `q` filters name/subject/skills (client can also filter).
 */
export const getAvailableTutorsForSlot = async ({ startISO, endISO, subject, q, forUserId } = {}) => {
  if (!startISO || !endISO) {
    const err = new Error('start and end (ISO timestamps) are required');
    err.statusCode = 400;
    throw err;
  }
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    const err = new Error('Invalid start or end time');
    err.statusCode = 400;
    throw err;
  }
  if (isPast(start)) {
    const err = new Error('Selected time is in the past');
    err.statusCode = 400;
    throw err;
  }

  const dateStr = toDateString(start);
  if (!dateStr) {
    const err = new Error('Could not derive session date');
    err.statusCode = 400;
    throw err;
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  let specialization = '';
  if (forUserId) {
    const u = await userModel.findById(forUserId);
    specialization = u?.specialization ? String(u.specialization).trim() : '';
  }
  const availabilities = await tutorModel.listAvailabilityForTutorsOnDate(dateStr, { specialization });
  const candidates = [];

  for (const av of availabilities) {
    const datePart = toDateString(av.available_date) || String(av.available_date).slice(0, 10);
    const startTime =
      typeof av.start_time === 'string' ? av.start_time : av.start_time?.slice(0, 8) || '00:00:00';
    const endTime =
      typeof av.end_time === 'string' ? av.end_time : av.end_time?.slice(0, 8) || '23:59:59';

    const slots = generateSlots({
      dateStr: datePart,
      startTime,
      endTime,
      sessionDuration: av.session_duration,
    });

    const match = slots.find((s) => s.start === startIso && s.end === endIso);
    if (!match) continue;

    const count = await bookingModel.countBookingsForSlot(av.id, match.start, match.end);
    const tutorOverlapCount = await bookingModel.countTutorOverlapsForSlot({
      tutorId: av.tutor_id,
      startTime: match.start,
      endTime: match.end,
      excludeAvailabilityId: av.id,
    });
    if (tutorOverlapCount > 0) continue;
    if (count >= av.max_students_per_slot) continue;

    const subs = Array.isArray(av.tutor_subjects) ? av.tutor_subjects : [];
    candidates.push({
      tutorProfileId: av.tutor_id,
      tutorUserId: av.tutor_user_id,
      email: av.tutor_email,
      displayName: av.tutor_display_name || av.tutor_email,
      avatarUrl: av.tutor_avatar_url || null,
      bio: av.tutor_bio || null,
      subjects: subs,
      availabilityId: av.id,
      slotStart: match.start,
      slotEnd: match.end,
      subjectMatch: subjectMatches(subs, subject || ''),
    });
  }

  const tutorIds = [...new Set(candidates.map((c) => c.tutorProfileId))];
  const completedMap = await bookingModel.countCompletedSessionsByTutorIds(tutorIds);

  let list = candidates.map((c) => ({
    tutorId: c.tutorProfileId,
    tutorUserId: c.tutorUserId,
    email: c.email,
    displayName: c.displayName,
    avatarUrl: c.avatarUrl,
    bio: c.bio,
    subjects: c.subjects,
    sessionsCompleted: completedMap.get(c.tutorProfileId) || 0,
    availabilityId: c.availabilityId,
    slotStart: c.slotStart,
    slotEnd: c.slotEnd,
    subjectMatch: c.subjectMatch,
  }));

  list = list.filter((t) => tutorSearchMatches(t, q));

  const subj = (subject || '').trim();
  list.sort((a, b) => {
    if (subj) {
      if (a.subjectMatch !== b.subjectMatch) return a.subjectMatch ? -1 : 1;
    }
    if (b.sessionsCompleted !== a.sessionsCompleted) return b.sessionsCompleted - a.sessionsCompleted;
    return (a.displayName || a.email).localeCompare(b.displayName || b.email);
  });

  return list;
};
