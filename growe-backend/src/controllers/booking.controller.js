import * as bookingModel from '../models/booking.model.js';
import * as bookingService from '../services/booking.service.js';

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
      });
    } else {
      bookings = await bookingModel.listByStudent(req.user.id, {
        status: req.query.status,
        limit: parseInt(req.query.limit, 10) || 50,
        offset: parseInt(req.query.offset, 10) || 0,
      });
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
    const updated = await bookingService.updateBookingStatus(req.params.id, 'cancelled');
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
