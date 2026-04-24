import { query } from '../config/db.js';
import * as userModel from '../models/user.model.js';
import * as roleModel from '../models/role.model.js';
import * as tutorModel from '../models/tutor.model.js';
import * as auditLogModel from '../models/auditLog.model.js';

const getClientIp = (req) => req.ip || req.connection?.remoteAddress || null;

/** All metrics read from the same PostgreSQL database as the rest of the app (single source of truth). */
export const getDashboardMetrics = async (req, res, next) => {
  try {
    const { rows: totalUsers } = await query('SELECT COUNT(*)::int as count FROM users');
    const { rows: activeUsers } = await query("SELECT COUNT(*)::int as count FROM users WHERE is_active = true AND is_verified = true");
    const { rows: verifiedUsers } = await query('SELECT COUNT(*)::int as count FROM users WHERE is_verified = true');
    const { rows: profileIncomplete } = await query(
      'SELECT COUNT(*)::int as count FROM users WHERE is_verified = true AND profile_completed = false'
    );
    res.json({
      totalUsers: totalUsers[0].count,
      activeUsers: activeUsers[0].count,
      verifiedUsers: verifiedUsers[0].count,
      profileIncomplete: profileIncomplete[0].count,
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

import * as notificationService from '../services/notification.service.js';

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
      notificationService.emitToAdmins('user_update', { userId: req.params.id, action: isActive ? 'activate' : 'deactivate' });
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
      notificationService.emitToAdmins('user_update', { userId: req.params.id, action: 'role_change', role: roleName });
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
    notificationService.emitToAdmins('user_update', { userId: req.params.id, action: 'suspend' });
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
    notificationService.emitToAdmins('user_update', { userId: req.params.id, action: 'unsuspend' });
    res.json(updated);
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

    // Send email to the removed user (fire and forget)
    notificationService.notifyAccountRemovedEmail({ email: user.email, name: user.display_name })
      .catch(e => console.error('Error sending removal email:', e));

    await auditLogModel.create({
      actorId: req.user.id,
      action: 'user_removed',
      resourceType: 'user',
      resourceId: userId,
      details: { email: user.email },
      ipAddress: getClientIp(req),
    });

    notificationService.emitToAdmins('admin_metric', { action: 'removal' });
    notificationService.emitToAdmins('user_update', { action: 'removed', userId });

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

