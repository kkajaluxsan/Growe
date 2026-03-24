import * as groupModel from '../models/group.model.js';

export const requireGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.id || req.params.groupId;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID required' });
    }

    const member = await groupModel.getMember(groupId, req.user.id);
    if (!member || member.status !== 'approved') {
      return res.status(403).json({ error: 'You must be an approved member of this group' });
    }

    req.groupMember = member;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireGroupCreator = async (req, res, next) => {
  try {
    const groupId = req.params.id || req.params.groupId;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID required' });
    }

    const group = await groupModel.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the group creator can perform this action' });
    }

    req.group = group;
    next();
  } catch (err) {
    next(err);
  }
};
