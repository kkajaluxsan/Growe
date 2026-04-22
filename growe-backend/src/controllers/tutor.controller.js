import * as tutorModel from '../models/tutor.model.js';
import * as groupTutorInviteModel from '../models/groupTutorInvite.model.js';
import * as userModel from '../models/user.model.js';
import * as availabilityService from '../services/availability.service.js';
import * as ratingModel from '../models/rating.model.js';

export const createProfile = async (req, res, next) => {
  try {
    const existing = await tutorModel.findProfileByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'Tutor profile already exists' });
    }
    const { bio, subjects = [] } = req.body;
    const profile = await tutorModel.createProfile({
      userId: req.user.id,
      bio: bio?.trim() || null,
      subjects: Array.isArray(subjects) ? subjects : [],
    });
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const profile = await tutorModel.findProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { bio, subjects } = req.body;
    const profile = await tutorModel.updateProfile(req.user.id, {
      bio: bio !== undefined ? bio?.trim() : undefined,
      subjects: subjects !== undefined ? (Array.isArray(subjects) ? subjects : []) : undefined,
    });
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

export const addAvailability = async (req, res, next) => {
  try {
    const profile = await tutorModel.findProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile required. Create a profile first.' });
    }
    const {
      availableDate,
      startTime,
      endTime,
      sessionDuration,
      isRecurring = false,
      maxStudentsPerSlot = 1,
    } = req.body;

    // Check for overlapping availability on the same date
    const overlap = await tutorModel.findOverlappingAvailability(
      profile.id, availableDate, startTime, endTime
    );
    if (overlap) {
      return res.status(409).json({
        error: `This window overlaps with existing availability (${overlap.start_time?.slice(0, 5)}–${overlap.end_time?.slice(0, 5)}). Delete or edit the existing slot first.`,
      });
    }

    const availability = await tutorModel.createAvailability({
      tutorId: profile.id,
      availableDate,
      startTime,
      endTime,
      sessionDuration: parseInt(sessionDuration, 10),
      isRecurring,
      maxStudentsPerSlot: parseInt(maxStudentsPerSlot, 10) || 1,
    });
    res.status(201).json(availability);
  } catch (err) {
    next(err);
  }
};

export const listAvailability = async (req, res, next) => {
  try {
    const profile = await tutorModel.findProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }
    const { fromDate, toDate } = req.query;
    const availability = await tutorModel.listAvailabilityByTutor(profile.id, {
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    res.json(availability);
  } catch (err) {
    next(err);
  }
};

export const deleteAvailability = async (req, res, next) => {
  try {
    const profile = await tutorModel.findProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }
    const deleted = await tutorModel.deleteAvailability(req.params.id, profile.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Availability not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const updateAvailability = async (req, res, next) => {
  try {
    const profile = await tutorModel.findProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }
    const {
      availableDate,
      startTime,
      endTime,
      sessionDuration,
      maxStudentsPerSlot = 1,
    } = req.body;

    // Check for overlapping availability on the same date (exclude current slot)
    const overlap = await tutorModel.findOverlappingAvailability(
      profile.id, availableDate, startTime, endTime, req.params.id
    );
    if (overlap) {
      return res.status(409).json({
        error: `This window overlaps with existing availability (${overlap.start_time?.slice(0, 5)}–${overlap.end_time?.slice(0, 5)}). Delete or edit the existing slot first.`,
      });
    }

    const updated = await tutorModel.updateAvailability(req.params.id, profile.id, {
      availableDate,
      startTime,
      endTime,
      sessionDuration: parseInt(sessionDuration, 10),
      maxStudentsPerSlot: parseInt(maxStudentsPerSlot, 10) || 1,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Availability not found' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { tutorId, fromDate, toDate, duration } = req.query;
    const slots = await availabilityService.getAvailableSlots({
      tutorId: tutorId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      studentId: req.user?.id || undefined,
      requestedDuration: duration,
    });
    res.json(slots);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

export const getAvailableTutorsByDate = async (req, res, next) => {
  try {
    const { date, groupId, duration } = req.query;
    const tutors = await availabilityService.getAvailableTutorsByDate({
      date,
      groupId,
      userId: req.user.id,
      requestedDuration: duration,
    });
    // Attach average rating
    const tutorUserIds = tutors.map((t) => t.userId || t.user_id).filter(Boolean);
    const ratingsMap = await ratingModel.getAverageByTutorIds(tutorUserIds);
    const enriched = tutors.map((t) => {
      const uid = t.userId || t.user_id;
      const ratingInfo = ratingsMap.get(uid) || { average: 0, count: 0 };
      return { ...t, avg_rating: ratingInfo.average, rating_count: ratingInfo.count };
    });

    res.json(enriched);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

export const listTutors = async (req, res, next) => {
  try {
    const tutors = await tutorModel.listTutorProfiles({
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
    });

    // Attach average rating to each tutor
    const tutorUserIds = tutors.map((t) => t.user_id).filter(Boolean);
    const ratingsMap = await ratingModel.getAverageByTutorIds(tutorUserIds);
    const enriched = tutors.map((t) => {
      const ratingInfo = ratingsMap.get(t.user_id) || { average: 0, count: 0 };
      return { ...t, avg_rating: ratingInfo.average, rating_count: ratingInfo.count };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

/** For group creation: tutors free at an exact slot (start/end ISO). */
export const getAvailableForGroupSlot = async (req, res, next) => {
  try {
    const { start, end, subject, q } = req.query;
    const tutors = await availabilityService.getAvailableTutorsForSlot({
      startISO: typeof start === 'string' ? start : '',
      endISO: typeof end === 'string' ? end : '',
      subject: typeof subject === 'string' ? subject : '',
      q: typeof q === 'string' ? q : '',
      forUserId: req.user.id,
    });
    // Attach average rating
    const tutorUserIds = tutors.map((t) => t.userId || t.user_id).filter(Boolean);
    const ratingsMap = await ratingModel.getAverageByTutorIds(tutorUserIds);
    const enriched = tutors.map((t) => {
      const uid = t.userId || t.user_id;
      const ratingInfo = ratingsMap.get(uid) || { average: 0, count: 0 };
      return { ...t, avg_rating: ratingInfo.average, rating_count: ratingInfo.count };
    });

    res.json(enriched);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

/** Pending group tutor invites for the logged-in tutor. */
export const listPendingGroupInvites = async (req, res, next) => {
  try {
    const rows = await groupTutorInviteModel.listPendingForTutor(req.user.id, {
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 50),
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/** Get ratings for a specific tutor (by user id). */
export const getTutorRatings = async (req, res, next) => {
  try {
    const tutorUserId = req.params.id;
    const avg = await ratingModel.getAverageByTutorId(tutorUserId);
    const reviews = await ratingModel.listByTutorId(tutorUserId, {
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 50),
      offset: parseInt(req.query.offset, 10) || 0,
    });
    res.json({ average: parseFloat(avg.average), count: avg.count, reviews });
  } catch (err) {
    next(err);
  }
};

/** Get the logged-in tutor's own ratings summary + reviews. */
export const getMyRatings = async (req, res, next) => {
  try {
    const avg = await ratingModel.getAverageByTutorId(req.user.id);
    const reviews = await ratingModel.listByTutorId(req.user.id, {
      limit: Math.min(parseInt(req.query.limit, 10) || 50, 100),
      offset: parseInt(req.query.offset, 10) || 0,
    });
    res.json({ average: parseFloat(avg.average), count: avg.count, reviews });
  } catch (err) {
    next(err);
  }
};
