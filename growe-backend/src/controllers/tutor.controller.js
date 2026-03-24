import * as tutorModel from '../models/tutor.model.js';
import * as availabilityService from '../services/availability.service.js';

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

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { tutorId, fromDate, toDate } = req.query;
    const slots = await availabilityService.getAvailableSlots({
      tutorId: tutorId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    res.json(slots);
  } catch (err) {
    next(err);
  }
};

export const listTutors = async (req, res, next) => {
  try {
    const tutors = await tutorModel.listTutorProfiles({
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
    });
    res.json(tutors);
  } catch (err) {
    next(err);
  }
};
