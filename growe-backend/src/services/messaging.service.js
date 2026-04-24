import * as conversationModel from '../models/conversation.model.js';
import * as messageModel from '../models/message.model.js';
import * as userModel from '../models/user.model.js';
import * as groupModel from '../models/group.model.js';
import * as meetingModel from '../models/meeting.model.js';
import * as tutorModel from '../models/tutor.model.js';
import { getNotificationIo } from '../config/socketRegistry.js';
import * as eligibleMessagingModel from '../models/eligibleMessaging.model.js';
import { sanitizeMessageContent } from '../utils/sanitize.js';
import { isValidChatAttachmentUrl } from '../utils/chatAttachment.js';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_ATTACHMENT_BYTES = Math.min(
  Number(process.env.MESSAGING_MAX_FILE_MB || 25) * 1024 * 1024,
  50 * 1024 * 1024
);
const MIN_MESSAGE_LENGTH = 1;

export const getEligibleMessagingUsers = async (userId, roleName, { search = '', limit = 30 } = {}) => {
  const isAdmin = roleName === 'admin';
  return eligibleMessagingModel.listEligibleUsers(userId, isAdmin, { search, limit });
};

export const getOrCreateDirectConversation = async (userId, otherUserId, roleName) => {
  if (userId === otherUserId) {
    const err = new Error('Cannot create conversation with yourself');
    err.statusCode = 400;
    throw err;
  }
  const other = await userModel.findById(otherUserId);
  if (!other || !other.is_active) {
    const err = new Error('User not found or inactive');
    err.statusCode = 404;
    throw err;
  }
  const isAdmin = roleName === 'admin';
  const allowed = await eligibleMessagingModel.canMessageUser(userId, otherUserId, isAdmin);
  if (!allowed) {
    const err = new Error(
      'You can only message active, verified users. Admins may message active users.'
    );
    err.statusCode = 403;
    err.code = 'MESSAGING_NOT_ALLOWED';
    throw err;
  }
  let conv = await conversationModel.findDirectBetween(userId, otherUserId);
  if (conv) return { conversation: await conversationModel.findById(conv.id), created: false };
  const conversation = await conversationModel.create({ type: 'DIRECT' });
  await conversationModel.addParticipant(conversation.id, userId);
  await conversationModel.addParticipant(conversation.id, otherUserId);
  return { conversation: await conversationModel.findById(conversation.id), created: true };
};

export const getOrCreateGroupConversation = async (userId, groupId) => {
  const member = await groupModel.getMember(groupId, userId);
  if (!member || member.status !== 'approved') {
    const err = new Error('You must be an approved group member');
    err.statusCode = 403;
    throw err;
  }
  const members = await groupModel.listMembers(groupId);
  const approvedIds = members.filter((x) => x.status === 'approved').map((x) => x.user_id);
  let conv = await conversationModel.findByGroupId(groupId);
  if (!conv) {
    const conversation = await conversationModel.create({ type: 'GROUP', groupId });
    for (const uid of approvedIds) {
      await conversationModel.addParticipant(conversation.id, uid);
    }
    return { conversation: await conversationModel.findById(conversation.id), created: true };
  }
  // Chat may have been created before some members joined; keep participants in sync with approved members.
  for (const uid of approvedIds) {
    await conversationModel.addParticipant(conv.id, uid);
  }
  return { conversation: await conversationModel.findById(conv.id), created: false };
};

export const getOrCreateMeetingConversation = async (userId, meetingId) => {
  const meeting = await meetingModel.findById(meetingId);
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }
  let isAuthorized = false;
  if (meeting.group_id) {
    const member = await groupModel.getMember(meeting.group_id, userId);
    const isGroupTutor = meeting.tutor_user_id === userId;
    if ((member && member.status === 'approved') || isGroupTutor) {
      isAuthorized = true;
    }
  } else if (meeting.booking_id) {
    const isTutor = meeting.tutor_user_id === userId;
    const isStudent = meeting.booking_student_id === userId;
    if (isTutor || isStudent) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    const err = new Error('You are not authorized to access this meeting chat');
    err.statusCode = 403;
    throw err;
  }
  let conv = await conversationModel.findByMeetingId(meetingId);
  if (conv) {
    await conversationModel.addParticipant(conv.id, userId);
    return { conversation: await conversationModel.findById(conv.id), created: false };
  }
  const conversation = await conversationModel.create({ type: 'MEETING', meetingId });
  await conversationModel.addParticipant(conversation.id, userId);
  return { conversation: await conversationModel.findById(conversation.id), created: true };
};

export const listConversations = async (userId, { limit, offset } = {}) => {
  const list = await conversationModel.listForUser(userId, { limit: limit || 50, offset: offset || 0 });
  const withUnread = await Promise.all(
    list.map(async (c) => {
      const unread = await conversationModel.getUnreadCount(c.id, userId);
      return { ...c, unreadCount: unread };
    })
  );
  return withUnread;
};

export const getConversationById = async (conversationId, userId) => {
  const conversation = await conversationModel.findById(conversationId);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.statusCode = 404;
    throw err;
  }
  const isParticipant = await conversationModel.isParticipant(conversationId, userId);
  if (!isParticipant) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  return conversation;
};

export const getMessages = async (conversationId, userId, { page = 1, limit = 20 } = {}) => {
  await getConversationById(conversationId, userId);
  const offset = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));
  const messages = await messageModel.listByConversation(conversationId, { limit: Math.min(50, Math.max(1, limit)), offset });
  return messages;
};

/**
 * @param {object|null} attachment - When set, creates a FILE message (url must be from POST .../attachments).
 */
export const sendMessage = async (conversationId, userId, content, messageType = 'TEXT', attachment = null) => {
  const isParticipant = await conversationModel.isParticipant(conversationId, userId);
  if (!isParticipant) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  const user = await userModel.findById(userId);
  if (!user?.is_active) {
    const err = new Error('Account is deactivated');
    err.statusCode = 403;
    throw err;
  }
  const profile = await tutorModel.findProfileByUserId(userId);
  if (profile?.is_suspended) {
    const err = new Error('Your tutor account is suspended');
    err.statusCode = 403;
    throw err;
  }

  if (attachment && typeof attachment === 'object' && attachment.url) {
    if (!isValidChatAttachmentUrl(attachment.url)) {
      const err = new Error('Invalid attachment');
      err.statusCode = 400;
      throw err;
    }
    const name = String(attachment.name ?? '').trim().slice(0, 512);
    if (!name) {
      const err = new Error('Attachment name is required');
      err.statusCode = 400;
      throw err;
    }
    const mime = String(attachment.mime ?? '').trim().slice(0, 127);
    const size = Number(attachment.size);
    if (!Number.isFinite(size) || size < 0 || size > MAX_ATTACHMENT_BYTES) {
      const err = new Error('Invalid attachment size');
      err.statusCode = 400;
      throw err;
    }
    const raw = content == null ? '' : String(content);
    const cap = sanitizeMessageContent(raw);
    const finalContent = cap.length >= MIN_MESSAGE_LENGTH ? cap : 'Sent a file';
    if (finalContent.length > MAX_MESSAGE_LENGTH) {
      const err = new Error(`Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
      err.statusCode = 400;
      throw err;
    }
    const message = await messageModel.create({
      conversationId,
      senderId: userId,
      content: finalContent,
      messageType: 'FILE',
      attachmentUrl: attachment.url,
      attachmentName: name,
      attachmentMime: mime || null,
      attachmentSize: Math.floor(size),
    });
    return messageModel.findById(message.id);
  }

  const sanitized = sanitizeMessageContent(content);
  if (sanitized.length < MIN_MESSAGE_LENGTH) {
    const err = new Error('Message content is required');
    err.statusCode = 400;
    throw err;
  }
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    err.statusCode = 400;
    throw err;
  }
  const message = await messageModel.create({
    conversationId,
    senderId: userId,
    content: sanitized,
    messageType: messageType === 'SYSTEM' ? 'SYSTEM' : 'TEXT',
  });
  const full = await messageModel.findById(message.id);
  return full;
};

export const editMessage = async (messageId, userId, content) => {
  const existing = await messageModel.findById(messageId);
  if (!existing) {
    const err = new Error('Message not found');
    err.statusCode = 404;
    throw err;
  }
  if (existing.message_type === 'SYSTEM') {
    const err = new Error('This message cannot be edited');
    err.statusCode = 400;
    throw err;
  }
  if (existing.sender_id !== userId) {
    const err = new Error('You can only edit your own messages');
    err.statusCode = 403;
    throw err;
  }
  const isParticipant = await conversationModel.isParticipant(existing.conversation_id, userId);
  if (!isParticipant) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  const sanitized = sanitizeMessageContent(content);
  if (sanitized.length < MIN_MESSAGE_LENGTH || sanitized.length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`Message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters`);
    err.statusCode = 400;
    throw err;
  }
  const updated = await messageModel.updateContent(messageId, userId, sanitized);
  if (!updated) return null;
  return messageModel.findById(messageId);
};

export const deleteMessage = async (messageId, userId) => {
  const existing = await messageModel.findById(messageId);
  if (!existing) {
    const err = new Error('Message not found');
    err.statusCode = 404;
    throw err;
  }
  if (existing.message_type === 'SYSTEM') {
    const err = new Error('This message cannot be deleted');
    err.statusCode = 400;
    throw err;
  }
  if (existing.sender_id !== userId) {
    const err = new Error('You can only delete your own messages');
    err.statusCode = 403;
    throw err;
  }
  return messageModel.softDelete(messageId, userId);
};

export const markAsRead = async (conversationId, userId) => {
  const isParticipant = await conversationModel.isParticipant(conversationId, userId);
  if (!isParticipant) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  const row = await conversationModel.updateLastRead(conversationId, userId);
  const io = getNotificationIo();
  if (io && row?.last_read_at) {
    io.to(`conversation-${conversationId}`).emit('conversation-read', {
      conversationId,
      userId,
      readAt: row.last_read_at,
    });
  }
  return row;
};

export const getUnreadCount = async (conversationId, userId) => {
  await getConversationById(conversationId, userId);
  return conversationModel.getUnreadCount(conversationId, userId);
};

export const getConversationParticipants = async (conversationId) => {
  return conversationModel.getParticipants(conversationId);
};
