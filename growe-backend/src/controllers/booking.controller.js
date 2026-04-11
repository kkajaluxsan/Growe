import * as bookingModel from '../models/booking.model.js';
import * as bookingService from '../services/booking.service.js';
import * as ratingModel from '../models/rating.model.js';
import * as notificationService from '../services/notification.service.js';

export const create = async (req, res, next) => {
  try {
    const { availabilityId, startTime, endTime } = req.body;
    const booking = await bookingService.createBooking({
      availabilityId,
      studentId: req.user.id,
      startTime,
      endTime,
    });
    res.status(201).json(booking);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    let bookings;
    if (req.user.roleName === 'tutor') {
      bookings = await bookingModel.listByTutor(req.user.id, {
        status: req.query.status,
        limit: parseInt(req.query.limit, 10) || 50,
        offset: parseInt(req.query.offset, 10) || 0,
        filterPast: false,
      });
    } else {
      bookings = await bookingModel.listByStudent(req.user.id, {
        status: req.query.status,
        limit: parseInt(req.query.limit, 10) || 50,
        offset: parseInt(req.query.offset, 10) || 0,
        filterPast: false,
      });
    }

    // Attach rating status for completed bookings (student side)
    if (req.user.roleName !== 'tutor') {
      const completedIds = bookings.filter((b) => b.status === 'completed').map((b) => b.id);
      const ratedSet = await ratingModel.findRatedBookingIds(completedIds);
      bookings = bookings.map((b) => ({
        ...b,
        is_rated: ratedSet.has(b.id),
      }));
    }

    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const booking = await bookingModel.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const isStudent = booking.student_id === req.user.id;
    const isTutor = booking.tutor_user_id === req.user.id;
    if (!isStudent && !isTutor && req.user.roleName !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

export const cancel = async (req, res, next) => {
  try {
    const booking = await bookingModel.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const isStudent = booking.student_id === req.user.id;
    const isTutor = booking.tutor_user_id === req.user.id;
    if (!isStudent && !isTutor) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await bookingService.updateBookingStatus(
      req.params.id,
      'cancelled',
      isTutor ? 'tutor' : 'student'
    );
    res.json(updated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const booking = await bookingModel.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.tutor_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the tutor can update booking status' });
    }
    const { status } = req.body;
    const updated = await bookingService.updateBookingStatus(req.params.id, status, 'tutor');
    res.json(updated);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

/** Student rates a tutor after a completed booking. */
export const rateTutor = async (req, res, next) => {
  try {
    const booking = await bookingModel.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the student of this booking can rate' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'You can only rate completed bookings' });
    }

    const existing = await ratingModel.findByBookingId(req.params.id);
    if (existing) {
      return res.status(409).json({ error: 'You have already rated this booking' });
    }

    const { rating, comment } = req.body;
    const created = await ratingModel.create({
      bookingId: req.params.id,
      studentId: req.user.id,
      tutorId: booking.tutor_user_id,
      rating: parseInt(rating, 10),
      comment: comment?.trim() || null,
    });

    // Notify the tutor about the new rating
    Promise.resolve()
      .then(() =>
        notificationService.notifyNewTutorRating({
          tutorUserId: booking.tutor_user_id,
          studentEmail: req.user.email,
          rating: parseInt(rating, 10),
        })
      )
      .catch(() => {});

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};
