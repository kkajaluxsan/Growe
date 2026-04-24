import {
  isPast,
  parseYYYYMMDDLocal,
  startOfLocalDay,
  combineDateAndTimeLocal,
} from '../utils/timeUtils.js';
import { isAllowedSpecialization } from '../constants/specializations.js';
import {
  isValidIndexNumber,
  isValidNIC,
  isValidPhone,
  normalizeIndexNumber,
  normalizeNIC,
} from '../utils/academicIdentity.js';

export const validateRegister = (req, res, next) => {
  const {
    email,
    password,
    roleName,
    name,
    academicYear,
    semester,
    specialization,
    indexNumber,
    nicNumber,
    phoneNumber,
  } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Invalid email format');
  } else if (email.length > 255) {
    errors.push('Email too long');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (password.length > 128) {
    errors.push('Password too long');
  }

  const validRoles = ['student', 'tutor'];
  if (!roleName || !validRoles.includes(roleName)) {
    errors.push('Valid role (student or tutor) is required');
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required');
  } else if (name.trim().length > 255) {
    errors.push('Name too long');
  }

  // Academic fields only required for students
  if (roleName === 'student') {
    const ay = parseInt(academicYear, 10);
    if (academicYear === undefined || academicYear === null || academicYear === '') {
      errors.push('Academic year is required');
    } else if (Number.isNaN(ay) || ay < 1 || ay > 4) {
      errors.push('Academic year must be between 1 and 4');
    }

    const sem = parseInt(semester, 10);
    if (semester === undefined || semester === null || semester === '') {
      errors.push('Semester is required');
    } else if (Number.isNaN(sem) || (sem !== 1 && sem !== 2)) {
      errors.push('Semester must be 1 or 2');
    }

    if (!specialization || typeof specialization !== 'string' || !isAllowedSpecialization(specialization)) {
      errors.push('Valid specialization is required');
    }
  }

  // Role-specific identity validation
  if (roleName === 'student') {
    // Students require index number
    const idx = normalizeIndexNumber(indexNumber);
    if (!idx || !isValidIndexNumber(idx)) {
      errors.push('Index number must start with IT and contain only numbers after');
    }
  } else if (roleName === 'tutor') {
    // Tutors require NIC number
    const nic = normalizeNIC(nicNumber);
    if (!nic || !isValidNIC(nic)) {
      errors.push('NIC must be 9 digits + V (old) or 12 digits (new)');
    }
  }

  if (!phoneNumber || typeof phoneNumber !== 'string' || !isValidPhone(phoneNumber)) {
    errors.push('Enter a valid Sri Lankan mobile number');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateRequestVerificationEmail = (req, res, next) => {
  const { email } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('Invalid email format');
  } else if (email.length > 255) {
    errors.push('Email too long');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateAiChat = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 8000) {
    return res.status(400).json({ error: 'Message is too long (max 8000 characters)' });
  }
  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  }
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateGroupCreate = (req, res, next) => {
  const { name, description, maxMembers } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string') {
    errors.push('Group name is required');
  } else if (name.trim().length === 0) {
    errors.push('Group name cannot be empty');
  } else if (name.length > 255) {
    errors.push('Group name too long');
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 2000) {
      errors.push('Description too long');
    }
  }

  if (maxMembers !== undefined && maxMembers !== null) {
    const n = parseInt(maxMembers, 10);
    if (isNaN(n) || n < 2 || n > 100) {
      errors.push('Max members must be between 2 and 100');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateGroupUpdate = (req, res, next) => {
  const { name, description, maxMembers } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string') {
      errors.push('Group name must be a string');
    } else if (name.trim().length === 0) {
      errors.push('Group name cannot be empty');
    } else if (name.length > 255) {
      errors.push('Group name too long');
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 2000) {
      errors.push('Description too long');
    }
  }

  if (maxMembers !== undefined && maxMembers !== null) {
    const n = parseInt(maxMembers, 10);
    if (isNaN(n) || n < 2 || n > 100) {
      errors.push('Max members must be between 2 and 100');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateTutorProfile = (req, res, next) => {
  const { bio, subjects } = req.body;
  const errors = [];

  if (bio !== undefined && bio !== null && typeof bio !== 'string') {
    errors.push('Bio must be a string');
  }

  if (subjects !== undefined && subjects !== null) {
    if (!Array.isArray(subjects)) {
      errors.push('Subjects must be an array');
    } else if (subjects.some((s) => typeof s !== 'string')) {
      errors.push('Each subject must be a string');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateAvailabilityCreate = (req, res, next) => {
  const availableDate = req.body.availableDate ?? req.body.available_date;
  const startTime = req.body.startTime ?? req.body.start_time;
  const endTime = req.body.endTime ?? req.body.end_time;
  const sessionDuration = req.body.sessionDuration ?? req.body.session_duration;
  const maxStudentsPerSlot = req.body.maxStudentsPerSlot ?? req.body.max_students_per_slot;
  const errors = [];

  const dateTrimmed = typeof availableDate === 'string' ? availableDate.trim() : '';
  if (!dateTrimmed) {
    errors.push('Available date is required');
  } else {
    const parsedDay = parseYYYYMMDDLocal(dateTrimmed);
    if (!parsedDay) {
      errors.push('Invalid date format (use YYYY-MM-DD)');
    } else if (parsedDay.getTime() < startOfLocalDay().getTime()) {
      errors.push('Available date cannot be in the past');
    }
  }

  if (!startTime || typeof startTime !== 'string') {
    errors.push('Start time is required');
  }
  if (!endTime || typeof endTime !== 'string') {
    errors.push('End time is required');
  }
  if (
    dateTrimmed &&
    startTime &&
    endTime &&
    typeof startTime === 'string' &&
    typeof endTime === 'string' &&
    parseYYYYMMDDLocal(dateTrimmed)
  ) {
    const startDt = combineDateAndTimeLocal(dateTrimmed, startTime);
    const endDt = combineDateAndTimeLocal(dateTrimmed, endTime);
    if (!startDt || !endDt || Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime())) {
      errors.push('Invalid start or end time');
    } else if (endDt.getTime() <= startDt.getTime()) {
      errors.push('End time must be after start time');
    } else if (isPast(endDt)) {
      errors.push('This availability window has already ended; choose a future end time or date');
    }
  }

  if (sessionDuration === undefined || sessionDuration === null) {
    errors.push('Session duration is required');
  } else {
    const sd = parseInt(sessionDuration, 10);
    if (isNaN(sd) || sd < 15 || sd > 480) {
      errors.push('Session duration must be between 15 and 480 minutes');
    } else if (
      dateTrimmed &&
      startTime && typeof startTime === 'string' &&
      endTime && typeof endTime === 'string' &&
      parseYYYYMMDDLocal(dateTrimmed)
    ) {
      const wStart = combineDateAndTimeLocal(dateTrimmed, startTime);
      const wEnd = combineDateAndTimeLocal(dateTrimmed, endTime);
      if (wStart && wEnd && !Number.isNaN(wStart.getTime()) && !Number.isNaN(wEnd.getTime())) {
        const windowMinutes = (wEnd.getTime() - wStart.getTime()) / 60000;
        if (windowMinutes < 15) {
          errors.push('Availability window must be at least 15 minutes');
        } else if (sd > windowMinutes) {
          errors.push(`Session duration (${sd} min) cannot exceed the availability window (${Math.round(windowMinutes)} min)`);
        }
      }
    }
  }

  if (maxStudentsPerSlot !== undefined && maxStudentsPerSlot !== null) {
    const m = parseInt(maxStudentsPerSlot, 10);
    if (isNaN(m) || m < 1 || m > 20) {
      errors.push('Max students per slot must be between 1 and 20');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }

  // Normalize to canonical camelCase for controllers/services
  req.body.availableDate = dateTrimmed || availableDate;
  req.body.startTime = startTime;
  req.body.endTime = endTime;
  req.body.sessionDuration = sessionDuration;
  if (maxStudentsPerSlot !== undefined) req.body.maxStudentsPerSlot = maxStudentsPerSlot;
  next();
};

export const validateBookingCreate = (req, res, next) => {
  const { availabilityId, startTime, endTime } = req.body;
  const errors = [];

  if (!availabilityId) {
    errors.push('Availability ID is required');
  }
  if (!startTime || typeof startTime !== 'string') {
    errors.push('Start time is required');
  }
  if (!endTime || typeof endTime !== 'string') {
    errors.push('End time is required');
  }

  if (startTime && endTime && typeof startTime === 'string' && typeof endTime === 'string') {
    const st = new Date(startTime);
    const en = new Date(endTime);
    if (Number.isNaN(st.getTime()) || Number.isNaN(en.getTime())) {
      errors.push('The selected time format is invalid');
    } else {
      if (isPast(st)) errors.push('The selected session time has already passed');
      if (en.getTime() <= st.getTime()) errors.push('The session end time must be after the start time');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateBookingStatus = (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['confirmed', 'cancelled', 'completed', 'no_show', 'rejected', 'waiting_tutor_confirmation'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: [`Status must be one of: ${validStatuses.join(', ')}`],
    });
  }
  next();
};

export const validateMeetingCreate = (req, res, next) => {
  const { groupId, title, scheduledAt, tutorId, slot } = req.body;
  const errors = [];

  if (!groupId) {
    errors.push('Group ID is required');
  }
  if (title !== undefined && title !== null && typeof title !== 'string') {
    errors.push('Title must be a string');
  }
  if (scheduledAt !== undefined && scheduledAt !== null && scheduledAt !== '') {
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) errors.push('scheduledAt must be a valid ISO date string');
    else if (isPast(d)) errors.push('Meeting scheduled time must be in the future');
  }
  if (tutorId && (!slot || !slot.availabilityId || !slot.startTime || !slot.endTime)) {
    errors.push('When selecting a tutor, slot (availabilityId, startTime, endTime) is required');
  } else if (tutorId && slot?.startTime && slot?.endTime) {
    const ss = new Date(slot.startTime);
    const ee = new Date(slot.endTime);
    if (!Number.isNaN(ss.getTime()) && isPast(ss)) {
      errors.push('Selected tutor slot is in the past');
    }
    if (!Number.isNaN(ss.getTime()) && !Number.isNaN(ee.getTime()) && ee.getTime() <= ss.getTime()) {
      errors.push('Slot end must be after slot start');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateMessageSend = (req, res, next) => {
  const { content } = req.body;
  const errors = [];
  if (content === undefined || content === null) {
    errors.push('Content is required');
  } else if (typeof content !== 'string') {
    errors.push('Content must be a string');
  } else if (content.length > 4000) {
    errors.push('Message must be at most 4000 characters');
  } else if (content.trim().length === 0) {
    errors.push('Message content cannot be empty');
  }
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateMessageEdit = (req, res, next) => {
  const { content } = req.body;
  const errors = [];
  if (content === undefined || content === null) {
    errors.push('Content is required');
  } else if (typeof content !== 'string') {
    errors.push('Content must be a string');
  } else if (content.length > 4000 || content.trim().length === 0) {
    errors.push('Message must be 1–4000 characters');
  }
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateRating = (req, res, next) => {
  const { rating, comment } = req.body;
  const errors = [];

  if (rating === undefined || rating === null) {
    errors.push('Rating is required');
  } else {
    const r = parseInt(rating, 10);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      errors.push('Rating must be between 1 and 5');
    }
  }

  if (comment !== undefined && comment !== null) {
    if (typeof comment !== 'string') {
      errors.push('Comment must be a string');
    } else if (comment.length > 1000) {
      errors.push('Comment must be at most 1000 characters');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateAdminUserUpdate = (req, res, next) => {
  const { isActive, roleName } = req.body;
  const errors = [];

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }
  if (roleName !== undefined) {
    const validRoles = ['admin', 'tutor', 'student'];
    if (!validRoles.includes(roleName)) {
      errors.push('Invalid role name');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};
