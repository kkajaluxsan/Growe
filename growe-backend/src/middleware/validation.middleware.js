import {
  isPast,
  parseYYYYMMDDLocal,
  startOfLocalDay,
  combineDateAndTimeLocal,
} from '../utils/timeUtils.js';

export const validateRegister = (req, res, next) => {
  const { email, password, roleName } = req.body;
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
      errors.push('Start and end must be valid datetimes');
    } else {
      if (isPast(st)) errors.push('Cannot book a session in the past');
      if (en.getTime() <= st.getTime()) errors.push('End time must be after start time');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
};

export const validateBookingStatus = (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['confirmed', 'cancelled', 'completed', 'no_show'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: ['Valid status (confirmed, cancelled, completed, no_show) is required'],
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
