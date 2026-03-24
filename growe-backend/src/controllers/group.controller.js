import * as groupModel from '../models/group.model.js';
import * as meetingModel from '../models/meeting.model.js';
import * as meetingService from '../services/meeting.service.js';

export const create = async (req, res, next) => {
  try {
    const { name, description, maxMembers = 10 } = req.body;
    const group = await groupModel.create({
      name: name.trim(),
      description: description?.trim() || null,
      creatorId: req.user.id,
      maxMembers: maxMembers || 10,
    });
    await groupModel.addMember(group.id, req.user.id, 'approved');
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
