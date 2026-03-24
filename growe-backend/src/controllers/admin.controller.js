import { query } from '../config/db.js';
import * as userModel from '../models/user.model.js';
import * as roleModel from '../models/role.model.js';
import * as tutorModel from '../models/tutor.model.js';
import * as meetingModel from '../models/meeting.model.js';
import * as bookingModel from '../models/booking.model.js';
import * as auditLogModel from '../models/auditLog.model.js';
import { emitMeetingTerminated } from '../sockets/signaling.socket.js';

const getClientIp = (req) => req.ip || req.connection?.remoteAddress || null;

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const { rows: totalUsers } = await query('SELECT COUNT(*)::int as count FROM users');
    const { rows: activeUsers } = await query("SELECT COUNT(*)::int as count FROM users WHERE is_active = true AND is_verified = true");
    const { rows: bookingsToday } = await query(
      "SELECT COUNT(*)::int as count FROM bookings WHERE DATE(start_time AT TIME ZONE 'UTC') = CURRENT_DATE AND status NOT IN ('cancelled')"
    );
    const { rows: activeMeetings } = await query(
      "SELECT COUNT(*)::int as count FROM meetings WHERE ended_at IS NULL AND created_at > NOW() - INTERVAL '24 hours'"
    );
    res.json({
      totalUsers: totalUsers[0].count,
      activeUsers: activeUsers[0].count,
      bookingsToday: bookingsToday[0].count,
      activeMeetings: activeMeetings[0].count,
    });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await userModel.listAll({
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
      roleName: req.query.roleName,
      isVerified: req.query.isVerified !== undefined ? req.query.isVerified === 'true' : undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { isActive, roleName } = req.body;
    let user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (isActive !== undefined) {
      user = await userModel.updateActive(req.params.id, isActive);
      await auditLogModel.create({
        actorId: req.user.id,
        action: isActive ? 'user_reactivate' : 'user_deactivate',
        resourceType: 'user',
        resourceId: req.params.id,
        details: { email: user.email },
        ipAddress: getClientIp(req),
      });
    }
    if (roleName) {
      const role = await roleModel.findByName(roleName);
      if (!role) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      user = await userModel.updateRole(req.params.id, role.id);
      await auditLogModel.create({
        actorId: req.user.id,
        action: 'user_role_change',
        resourceType: 'user',
        resourceId: req.params.id,
        details: { email: user.email, newRole: roleName },
        ipAddress: getClientIp(req),
      });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const suspendTutor = async (req, res, next) => {
  try {
    const profile = await tutorModel.findProfileByUserId(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }
    const updated = await tutorModel.setSuspended(req.params.id, true);
    await auditLogModel.create({
      actorId: req.user.id,
      action: 'tutor_suspend',
      resourceType: 'tutor',
      resourceId: profile.id,
      details: { userId: req.params.id },
      ipAddress: getClientIp(req),
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const unsuspendTutor = async (req, res, next) => {
  try {
    const profile = await tutorModel.findProfileByUserId(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }
    const updated = await tutorModel.setSuspended(req.params.id, false);
    await auditLogModel.create({
      actorId: req.user.id,
      action: 'tutor_unsuspend',
      resourceType: 'tutor',
      resourceId: profile.id,
      details: { userId: req.params.id },
      ipAddress: getClientIp(req),
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const terminateMeeting = async (req, res, next) => {
  try {
    const meeting = await meetingModel.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const updated = await meetingModel.terminateMeeting(req.params.id);
    const io = req.app.get('io');
    if (io) {
      emitMeetingTerminated(io, req.params.id);
    }
    await auditLogModel.create({
      actorId: req.user.id,
      action: 'meeting_terminate',
      resourceType: 'meeting',
      resourceId: req.params.id,
      details: { groupId: meeting.group_id },
      ipAddress: getClientIp(req),
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const getBookingLogs = async (req, res, next) => {
  try {
    const bookings = await bookingModel.listAllForAdmin({
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0,
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

export const removeUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove your own account' });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deleted = await userModel.deleteById(userId);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to remove user' });
    }

    await auditLogModel.create({
      actorId: req.user.id,
      action: 'user_removed',
      resourceType: 'user',
      resourceId: userId,
      details: { email: user.email },
      ipAddress: getClientIp(req),
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getAuditLog = async (req, res, next) => {
  try {
    const logs = await auditLogModel.list({
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
      action: req.query.action || undefined,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

export const listActiveMeetings = async (req, res, next) => {
  try {
    const meetings = await meetingModel.listActiveForAdmin();
    res.json(meetings);
  } catch (err) {
    next(err);
  }
};

export const getReliabilityRanking = async (req, res, next) => {
  try {
    const ranking = await bookingModel.getReliabilityRanking({
      limit: parseInt(req.query.limit, 10) || 50,
    });
    res.json(ranking);
  } catch (err) {
    next(err);
  }
};
