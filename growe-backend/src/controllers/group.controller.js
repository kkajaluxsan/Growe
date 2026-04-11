import * as groupModel from '../models/group.model.js';
import * as meetingModel from '../models/meeting.model.js';
import * as meetingService from '../services/meeting.service.js';
import * as groupInviteModel from '../models/groupInvite.model.js';
import * as groupTutorInviteModel from '../models/groupTutorInvite.model.js';
import * as tutorModel from '../models/tutor.model.js';
import * as userModel from '../models/user.model.js';
import * as bookingService from '../services/booking.service.js';
import * as availabilityService from '../services/availability.service.js';
import * as notificationService from '../services/notification.service.js';
import { logger } from '../utils/logger.js';
import { generateVerificationToken } from '../utils/generateToken.js';
import { isPast } from '../utils/timeUtils.js';

async function assertTutorInviteIsValid({ creatorId, tutorInvite }) {
  const {
    tutorUserId,
    availabilityId,
    slotStart,
    slotEnd,
    subject: subjectLine,
  } = tutorInvite;
  if (!tutorUserId || !availabilityId || !slotStart || !slotEnd) {
    const err = new Error('tutorInvite requires tutorUserId, availabilityId, slotStart, and slotEnd');
    err.statusCode = 400;
    throw err;
  }
  const slotStartMs = new Date(slotStart).getTime();
  if (Number.isNaN(slotStartMs) || isPast(new Date(slotStart))) {
    const err = new Error('Session time must be in the future');
    err.statusCode = 400;
    throw err;
  }
  const tutorUser = await userModel.findById(tutorUserId);
  if (!tutorUser || tutorUser.role_name !== 'tutor') {
    const err = new Error('Invalid tutor');
    err.statusCode = 400;
    throw err;
  }
  const tutorProfile = await tutorModel.findProfileByUserId(tutorUserId);
  if (!tutorProfile || tutorProfile.is_suspended) {
    const err = new Error('Tutor is not available');
    err.statusCode = 400;
    throw err;
  }
  if (tutorUserId === creatorId) {
    const err = new Error('You cannot invite yourself as tutor');
    err.statusCode = 400;
    throw err;
  }

  const available = await availabilityService.getAvailableTutorsForSlot({
    startISO: slotStart,
    endISO: slotEnd,
    subject: subjectLine || '',
    q: '',
    forUserId: creatorId,
  });
  const startMs = new Date(slotStart).getTime();
  const endMs = new Date(slotEnd).getTime();
  const match = available.find((t) => {
    if (t.tutorUserId !== tutorUserId || t.availabilityId !== availabilityId) return false;
    return new Date(t.slotStart).getTime() === startMs && new Date(t.slotEnd).getTime() === endMs;
  });
  if (!match) {
    const err = new Error('That tutor or time slot is no longer available');
    err.statusCode = 409;
    throw err;
  }
}

async function createTutorInviteRecord({ group, creatorId, tutorInvite }) {
  const { tutorUserId, availabilityId, slotStart, slotEnd, subject: subjectLine } = tutorInvite;
  const invite = await groupTutorInviteModel.create({
    groupId: group.id,
    tutorUserId,
    requestedBy: creatorId,
    subject: typeof subjectLine === 'string' ? subjectLine.trim() || null : null,
    availabilityId,
    slotStart,
    slotEnd,
  });

  const requester = await userModel.findById(creatorId);
  await notificationService.notifyGroupTutorInviteRequested({
    tutorUserId,
    groupName: group.name,
    groupId: group.id,
    requesterDisplayName: requester?.display_name || requester?.email || 'A student',
    slotStart,
  });

  return invite;
}

export const create = async (req, res, next) => {
  try {
    const { name, description, maxMembers = 10, tutorInvite } = req.body;

    if (tutorInvite !== undefined && tutorInvite !== null) {
      if (typeof tutorInvite !== 'object' || Array.isArray(tutorInvite)) {
        return res.status(400).json({ error: 'tutorInvite must be an object when provided' });
      }
    }

    const hasTutorInvite = tutorInvite && Object.keys(tutorInvite).length > 0;
    if (hasTutorInvite) {
      try {
        await assertTutorInviteIsValid({ creatorId: req.user.id, tutorInvite });
      } catch (e) {
        if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
        throw e;
      }
    }

    const group = await groupModel.create({
      name: name.trim(),
      description: description?.trim() || null,
      creatorId: req.user.id,
      maxMembers: maxMembers || 10,
    });
    await groupModel.addMember(group.id, req.user.id, 'approved');

    if (hasTutorInvite) {
      try {
        await createTutorInviteRecord({ group, creatorId: req.user.id, tutorInvite });
      } catch (inviteErr) {
        logger.warn('createTutorInviteRecord_failed', { err: inviteErr.message, groupId: group.id });
        if (inviteErr.code === '23505') {
          return res.status(409).json({ error: 'A pending invite already exists for this tutor' });
        }
        throw inviteErr;
      }
    }

    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    const groups = await groupModel.listForUser(req.user.id);
    res.json(groups);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const group = await groupModel.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const member = await groupModel.getMember(req.params.id, req.user.id);
    if (!member || member.status !== 'approved') {
      return res.status(403).json({ error: 'You must be a member to view this group' });
    }
    res.json(group);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { name, description, maxMembers } = req.body;
    const group = await groupModel.update(req.params.id, {
      name: name?.trim(),
      description: description !== undefined ? description?.trim() : undefined,
      maxMembers,
    });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(group);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const deleted = await groupModel.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const requestJoin = async (req, res, next) => {
  try {
    const group = await groupModel.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const existing = await groupModel.getMember(req.params.id, req.user.id);
    if (existing) {
      if (existing.status === 'rejected') {
        await groupModel.addMember(req.params.id, req.user.id, 'pending');
        return res.status(201).json({ message: 'Join request sent' });
      }
      return res.status(409).json({ error: 'Already a member or pending' });
    }
    const count = await groupModel.countApprovedMembers(req.params.id);
    if (count >= group.max_members) {
      return res.status(400).json({ error: 'Group is full' });
    }
    await groupModel.addMember(req.params.id, req.user.id, 'pending');
    res.status(201).json({ message: 'Join request sent' });
  } catch (err) {
    next(err);
  }
};

export const approveJoin = async (req, res, next) => {
  try {
    const member = await groupModel.approveMember(req.params.id, req.params.userId);
    if (!member) {
      return res.status(404).json({ error: 'Pending request not found' });
    }
    const group = await groupModel.findById(req.params.id);
    try {
      await notificationService.notifyGroupMemberAdded({
        inviteeUserId: req.params.userId,
        groupId: req.params.id,
        groupName: group?.name,
      });
    } catch (e) {
      logger.warn('notifyGroupMemberAdded_after_approve_failed', { err: e.message });
    }
    res.json(member);
  } catch (err) {
    next(err);
  }
};

export const rejectJoin = async (req, res, next) => {
  try {
    const member = await groupModel.rejectMember(req.params.id, req.params.userId);
    if (!member) {
      return res.status(404).json({ error: 'Pending request not found' });
    }
    res.json(member);
  } catch (err) {
    next(err);
  }
};

export const listMembers = async (req, res, next) => {
  try {
    const member = await groupModel.getMember(req.params.id, req.user.id);
    if (!member || member.status !== 'approved') {
      return res.status(403).json({ error: 'You must be a member to view members' });
    }
    const members = await groupModel.listMembers(req.params.id);
    res.json(members);
  } catch (err) {
    next(err);
  }
};

export const createInviteLink = async (req, res, next) => {
  try {
    const group = await groupModel.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const token = generateVerificationToken(24);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await groupInviteModel.create({
      groupId: req.params.id,
      createdBy: req.user.id,
      token,
      expiresAt,
      maxUses: 0,
    });

    const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const inviteUrl = `${frontend}/groups/join?token=${encodeURIComponent(token)}`;

    Promise.resolve()
      .then(() =>
        notificationService.notifyGroupInviteLinkCreated({
          creatorUserId: req.user.id,
          groupName: group.name,
          inviteUrl,
        })
      )
      .catch(() => {});

    res.status(201).json({
      inviteId: invite.id,
      groupId: invite.group_id,
      expiresAt: invite.expires_at,
      inviteUrl,
      token,
    });
  } catch (err) {
    next(err);
  }
};

export const joinByInviteToken = async (req, res, next) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Invite token is required' });
    }

    const invite = await groupInviteModel.findValidByToken(token);
    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite link' });
    }

    const group = await groupModel.findById(invite.group_id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const count = await groupModel.countApprovedMembers(invite.group_id);
    if (count >= group.max_members) {
      return res.status(400).json({ error: 'Group is full' });
    }

    const existing = await groupModel.getMember(invite.group_id, req.user.id);
    if (existing?.status === 'approved') {
      return res.json({ message: 'Already a member', groupId: invite.group_id });
    }

    await groupModel.addMember(invite.group_id, req.user.id, 'approved');
    await groupInviteModel.incrementUse(invite.id);

    res.status(201).json({ message: 'Joined group', groupId: invite.group_id });
  } catch (err) {
    next(err);
  }
};

export const searchUsersToAdd = async (req, res, next) => {
  try {
    const q = typeof req.query?.q === 'string' ? req.query.q : '';
    if (!q.trim()) return res.json([]);
    const searcher = await userModel.findById(req.user.id);
    const specialization = searcher?.specialization ? String(searcher.specialization).trim() : '';
    const users = await groupModel.searchUsersNotInGroup(req.params.id, q, {
      limit: Math.min(parseInt(req.query.limit, 10) || 10, 25),
      offset: parseInt(req.query.offset, 10) || 0,
      searcherUserId: req.user.id,
      specialization,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const addMemberBySearch = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const group = await groupModel.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const count = await groupModel.countApprovedMembers(req.params.id);
    if (count >= group.max_members) {
      return res.status(400).json({ error: 'Group is full' });
    }
    const member = await groupModel.addMember(req.params.id, userId, 'approved');
    try {
      await notificationService.notifyGroupMemberAdded({
        inviteeUserId: userId,
        groupId: req.params.id,
        groupName: group.name,
      });
    } catch (e) {
      logger.warn('notifyGroupMemberAdded_failed', { err: e.message, groupId: req.params.id, userId });
    }
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
};

export const createMeeting = async (req, res, next) => {
  try {
    const { groupId, title, scheduledAt, tutorId, slot } = req.body;
    const meeting = await meetingService.createMeeting({
      groupId,
      title,
      createdBy: req.user.id,
      scheduledAt: scheduledAt || null,
      tutorId: tutorId || null,
      slot: slot && slot.availabilityId && slot.startTime && slot.endTime ? slot : undefined,
    });
    res.status(201).json(meeting);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

export const listMeetings = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const meetings =
      from && to
        ? await meetingModel.listByUserInRange(req.user.id, from, to)
        : await meetingModel.listByUser(req.user.id);
    res.json(meetings);
  } catch (err) {
    next(err);
  }
};

export const getMeetingById = async (req, res, next) => {
  try {
    const meeting = await meetingModel.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const member = await groupModel.getMember(meeting.group_id, req.user.id);
    if (!member || member.status !== 'approved') {
      return res.status(403).json({ error: 'You must be a group member to view this meeting' });
    }
    res.json(meeting);
  } catch (err) {
    next(err);
  }
};

export const getTutorInviteForGroup = async (req, res, next) => {
  try {
    const pending = await groupTutorInviteModel.findPendingByGroupId(req.params.id);
    res.json(pending);
  } catch (err) {
    next(err);
  }
};

export const acceptGroupTutorInvite = async (req, res, next) => {
  try {
    const { groupId, inviteId } = req.params;
    const invite = await groupTutorInviteModel.findPendingForTutorByInviteId(inviteId, req.user.id);
    if (!invite || invite.group_id !== groupId) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const count = await groupModel.countApprovedMembers(groupId);
    if (count >= group.max_members) {
      return res.status(400).json({ error: 'Group is full' });
    }

    const existingMember = await groupModel.getMember(groupId, req.user.id);
    if (!existingMember || existingMember.status !== 'approved') {
      await groupModel.addMember(groupId, req.user.id, 'approved');
    }

    let booking;
    try {
      booking = await bookingService.createBooking({
        availabilityId: invite.availability_id,
        studentId: invite.requested_by,
        startTime: invite.slot_start,
        endTime: invite.slot_end,
      });
    } catch (bookErr) {
      if (bookErr.statusCode === 409) {
        return res.status(409).json({
          error: bookErr.message || 'This time slot was just booked. Please ask the student to pick another slot.',
        });
      }
      throw bookErr;
    }

    await bookingService.updateBookingStatus(booking.id, 'confirmed', 'tutor');

    const tutorProfile = await tutorModel.findProfileByUserId(req.user.id);
    const meeting = await meetingModel.create({
      groupId,
      title: `Group session — ${group.name}`,
      createdBy: invite.requested_by,
      scheduledAt: invite.slot_start,
      tutorId: tutorProfile.id,
    });

    await groupTutorInviteModel.updateStatus(invite.id, 'accepted', {
      meetingId: meeting.id,
      bookingId: booking.id,
    });

    try {
      await notificationService.notifyMeetingScheduled({ meeting, groupName: group.name });
    } catch (e) {
      logger.warn('notifyMeetingScheduled_after_tutor_accept', { err: e.message });
    }

    const tutorUser = await userModel.findById(req.user.id);
    try {
      await notificationService.notifyGroupTutorInviteAcceptedStudent({
        studentUserId: invite.requested_by,
        groupName: group.name,
        tutorDisplayName: tutorUser?.display_name || tutorUser?.email,
        meetingId: meeting.id,
      });
    } catch (e) {
      logger.warn('notifyGroupTutorInviteAcceptedStudent_failed', { err: e.message });
    }

    res.json({ meeting, booking, status: 'accepted' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

export const rejectGroupTutorInvite = async (req, res, next) => {
  try {
    const { groupId, inviteId } = req.params;
    const invite = await groupTutorInviteModel.findPendingForTutorByInviteId(inviteId, req.user.id);
    if (!invite || invite.group_id !== groupId) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    await groupTutorInviteModel.updateStatus(invite.id, 'rejected');
    const tutorUser = await userModel.findById(req.user.id);
    try {
      await notificationService.notifyGroupTutorInviteRejected({
        studentUserId: invite.requested_by,
        groupName: invite.group_name,
        tutorDisplayName: tutorUser?.display_name || tutorUser?.email,
      });
    } catch (e) {
      logger.warn('notifyGroupTutorInviteRejected_failed', { err: e.message });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
