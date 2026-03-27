import * as messagingService from '../services/messaging.service.js';

export const listConversations = async (req, res, next) => {
  try {
    const list = await messagingService.listConversations(req.user.id, {
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
    });
    res.json(list);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const getEligibleUsers = async (req, res, next) => {
  try {
    const users = await messagingService.getEligibleMessagingUsers(req.user.id, req.user.roleName, {
      search: req.query.q || '',
      limit: Math.min(50, parseInt(req.query.limit, 10) || 30),
    });
    res.json(users);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const getOrCreateDirect = async (req, res, next) => {
  try {
    const { userId: otherUserId } = req.params;
    const { conversation, created } = await messagingService.getOrCreateDirectConversation(
      req.user.id,
      otherUserId,
      req.user.roleName
    );
    res.status(created ? 201 : 200).json(conversation);
  } catch (err) {
    if (err.statusCode) {
      const body = { error: err.message };
      if (err.code) body.code = err.code;
      return res.status(err.statusCode).json(body);
    }
    next(err);
  }
};

export const getOrCreateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { conversation, created } = await messagingService.getOrCreateGroupConversation(req.user.id, groupId);
    const participants = await messagingService.getConversationParticipants(conversation.id);
    res.status(created ? 201 : 200).json({ ...conversation, participants });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const getOrCreateMeeting = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { conversation, created } = await messagingService.getOrCreateMeetingConversation(req.user.id, meetingId);
    const participants = await messagingService.getConversationParticipants(conversation.id);
    res.status(created ? 201 : 200).json({ ...conversation, participants });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const conversation = await messagingService.getConversationById(req.params.id, req.user.id);
    const participants = await messagingService.getConversationParticipants(req.params.id);
    res.json({ ...conversation, participants });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const messages = await messagingService.getMessages(req.params.id, req.user.id, {
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(50, parseInt(req.query.limit, 10) || 20),
    });
    res.json(messages);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const message = await messagingService.sendMessage(
      req.params.id,
      req.user.id,
      req.body.content,
      req.body.messageType
    );
    res.status(201).json(message);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    await messagingService.getConversationById(req.params.id, req.user.id);
    const url = `/uploads/messaging/${req.file.filename}`;
    res.status(201).json({
      url,
      name: req.file.originalname || req.file.filename,
      mime: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await messagingService.getUnreadCount(req.params.id, req.user.id);
    res.json({ unreadCount: count });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    await messagingService.deleteMessage(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const editMessage = async (req, res, next) => {
  try {
    const message = await messagingService.editMessage(req.params.id, req.user.id, req.body.content);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    res.json(message);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    await messagingService.markAsRead(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
};
