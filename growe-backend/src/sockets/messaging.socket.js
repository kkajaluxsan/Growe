import * as conversationModel from '../models/conversation.model.js';
import * as messageModel from '../models/message.model.js';
import * as userModel from '../models/user.model.js';
import * as tutorModel from '../models/tutor.model.js';
import * as messagingService from '../services/messaging.service.js';
import { sanitizeMessageContent } from '../utils/sanitize.js';

const MAX_MESSAGE_LENGTH = 4000;
const TYPING_TIMEOUT_MS = 3000;

const typingTimers = new Map();

function stopTypingBroadcast(socket, conversationId) {
  const key = `${socket.userId}-${conversationId}`;
  if (typingTimers.has(key)) {
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);
  }
  socket.to(`conversation-${conversationId}`).emit('stop-typing', { userId: socket.userId });
}

async function assertUserCanUseMessaging(socket) {
  const user = await userModel.findById(socket.userId);
  if (!user?.is_active) {
    const err = new Error('Account is deactivated');
    err.statusCode = 403;
    throw err;
  }
  if (!user.is_verified) {
    const err = new Error('Please verify your email to unlock all features');
    err.code = 'EMAIL_NOT_VERIFIED';
    err.statusCode = 403;
    throw err;
  }
  const profile = await tutorModel.findProfileByUserId(socket.userId);
  if (profile?.is_suspended) {
    const err = new Error('Account suspended');
    err.statusCode = 403;
    throw err;
  }
  return user;
}

export const initMessaging = (io) => {
  io.on('connection', (socket) => {
    socket.on('join-conversation', async (data, callback) => {
      try {
        const { conversationId } = data;
        if (!conversationId) {
          callback?.({ error: 'Conversation ID required' });
          return;
        }
        const isParticipant = await conversationModel.isParticipant(conversationId, socket.userId);
        if (!isParticipant) {
          callback?.({ error: 'Access denied' });
          return;
        }
        const room = `conversation-${conversationId}`;
        await socket.join(room);
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed to join' });
      }
    });

    socket.on('leave-conversation', (data) => {
      const { conversationId } = data || {};
      if (conversationId) {
        stopTypingBroadcast(socket, conversationId);
        socket.leave(`conversation-${conversationId}`);
      }
    });

    socket.on('send-message', async (data, callback) => {
      try {
        const { conversationId, content, attachment } = data || {};
        const hasAttachment =
          attachment &&
          typeof attachment === 'object' &&
          typeof attachment.url === 'string' &&
          attachment.url.length > 0;
        if (!conversationId) {
          callback?.({ error: 'Conversation ID required' });
          return;
        }
        if (!hasAttachment && content == null) {
          callback?.({ error: 'Conversation ID and content required' });
          return;
        }
        const user = await userModel.findById(socket.userId);
        if (!user?.is_active) {
          callback?.({ error: 'Account is deactivated' });
          return;
        }
        if (!user.is_verified) {
          callback?.({ error: 'Please verify your email to unlock all features', code: 'EMAIL_NOT_VERIFIED' });
          return;
        }
        const isParticipant = await conversationModel.isParticipant(conversationId, socket.userId);
        if (!isParticipant) {
          callback?.({ error: 'Access denied' });
          return;
        }
        const profile = await tutorModel.findProfileByUserId(socket.userId);
        if (profile?.is_suspended) {
          callback?.({ error: 'Account suspended' });
          return;
        }
        let full;
        if (hasAttachment) {
          full = await messagingService.sendMessage(
            conversationId,
            socket.userId,
            content == null ? '' : String(content),
            'FILE',
            {
              url: attachment.url,
              name: attachment.name,
              mime: attachment.mime,
              size: attachment.size,
            }
          );
        } else {
          const sanitized = sanitizeMessageContent(String(content));
          if (sanitized.length < 1 || sanitized.length > MAX_MESSAGE_LENGTH) {
            callback?.({ error: 'Invalid message length' });
            return;
          }
          full = await messagingService.sendMessage(conversationId, socket.userId, String(content), 'TEXT');
        }
        socket.to(`conversation-${conversationId}`).emit('receive-message', full);
        callback?.({ success: true, message: full });
      } catch (err) {
        const status = err.statusCode;
        const msg = err.message || 'Failed to send';
        callback?.({ error: msg, code: status === 400 ? 'INVALID_MESSAGE' : undefined });
      }
    });

    socket.on('typing', async (data) => {
      try {
        const { conversationId } = data || {};
        if (!conversationId) return;
        const user = await userModel.findById(socket.userId);
        if (!user?.is_active || !user.is_verified) return;
        const isParticipant = await conversationModel.isParticipant(conversationId, socket.userId);
        if (!isParticipant) return;
        const key = `${socket.userId}-${conversationId}`;
        if (typingTimers.has(key)) {
          clearTimeout(typingTimers.get(key));
        }
        socket.to(`conversation-${conversationId}`).emit('typing', { userId: socket.userId });
        const t = setTimeout(() => {
          typingTimers.delete(key);
          socket.to(`conversation-${conversationId}`).emit('stop-typing', { userId: socket.userId });
        }, TYPING_TIMEOUT_MS);
        typingTimers.set(key, t);
      } catch (_) {}
    });

    socket.on('stop-typing', (data) => {
      const { conversationId } = data || {};
      if (conversationId) stopTypingBroadcast(socket, conversationId);
    });

    socket.on('mark-as-read', async (data, callback) => {
      try {
        const { conversationId } = data || {};
        if (!conversationId) {
          callback?.({ error: 'Conversation ID required' });
          return;
        }
        const user = await userModel.findById(socket.userId);
        if (!user?.is_active) {
          callback?.({ error: 'Account is deactivated' });
          return;
        }
        if (!user.is_verified) {
          callback?.({ error: 'Please verify your email to unlock all features', code: 'EMAIL_NOT_VERIFIED' });
          return;
        }
        const isParticipant = await conversationModel.isParticipant(conversationId, socket.userId);
        if (!isParticipant) {
          callback?.({ error: 'Access denied' });
          return;
        }
        await conversationModel.updateLastRead(conversationId, socket.userId);
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('edit-message', async (data, callback) => {
      try {
        const { messageId, content } = data || {};
        if (!messageId || content == null) {
          callback?.({ error: 'Message ID and content required' });
          return;
        }
        const sanitized = sanitizeMessageContent(String(content));
        if (sanitized.length < 1 || sanitized.length > MAX_MESSAGE_LENGTH) {
          callback?.({ error: 'Invalid message length' });
          return;
        }
        const full = await messagingService.editMessage(messageId, socket.userId, String(content));
        if (!full) {
          callback?.({ error: 'Update failed' });
          return;
        }
        io.to(`conversation-${full.conversation_id}`).emit('message-edited', full);
        callback?.({ success: true, message: full });
      } catch (err) {
        if (err.statusCode) {
          callback?.({ error: err.message });
          return;
        }
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('delete-message', async (data, callback) => {
      try {
        const { messageId } = data || {};
        if (!messageId) {
          callback?.({ error: 'Message ID required' });
          return;
        }
        const existing = await messageModel.findById(messageId);
        if (!existing) {
          callback?.({ error: 'Message not found or access denied' });
          return;
        }
        const convId = existing.conversation_id;
        await messagingService.deleteMessage(messageId, socket.userId);
        io.to(`conversation-${convId}`).emit('message-deleted', { messageId, conversationId: convId });
        callback?.({ success: true });
      } catch (err) {
        if (err.statusCode) {
          callback?.({ error: err.message });
          return;
        }
        callback?.({ error: err.message || 'Failed' });
      }
    });

    // --- Direct (1:1) voice / video — relay via user-${id} rooms (joined in signaling socket) ---
    socket.on('dm-call-invite', async (data, callback) => {
      try {
        const { conversationId, callId, callType, sessionBooking } = data || {};
        if (!conversationId || !callId || (callType !== 'voice' && callType !== 'video')) {
          callback?.({ error: 'Invalid call' });
          return;
        }
        const normalizedSessionBooking =
          sessionBooking && typeof sessionBooking === 'object'
            ? {
                bookingId: Number(sessionBooking.bookingId) || null,
                callerRole:
                  sessionBooking.callerRole === 'student' || sessionBooking.callerRole === 'tutor'
                    ? sessionBooking.callerRole
                    : null,
              }
            : null;
        await assertUserCanUseMessaging(socket);
        const otherId = await conversationModel.getDirectOtherUserId(conversationId, socket.userId);
        if (!otherId) {
          callback?.({ error: 'Calls are only available in direct chats between two people' });
          return;
        }
        const me = await userModel.findById(socket.userId);
        io.to(`user-${otherId}`).emit('dm-incoming-call', {
          callId,
          conversationId,
          callType,
          fromUserId: socket.userId,
          fromDisplayName: me.display_name || me.email,
          sessionBooking: normalizedSessionBooking,
        });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('dm-call-cancel', async (data, callback) => {
      try {
        const { conversationId, callId } = data || {};
        if (!conversationId || !callId) {
          callback?.({ error: 'Invalid' });
          return;
        }
        await assertUserCanUseMessaging(socket);
        const otherId = await conversationModel.getDirectOtherUserId(conversationId, socket.userId);
        if (!otherId) {
          callback?.({ error: 'Invalid conversation' });
          return;
        }
        io.to(`user-${otherId}`).emit('dm-call-ended', { callId, conversationId, reason: 'cancelled' });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('dm-call-accept', async (data, callback) => {
      try {
        const { conversationId, callId } = data || {};
        if (!conversationId || !callId) {
          callback?.({ error: 'Invalid' });
          return;
        }
        await assertUserCanUseMessaging(socket);
        const otherId = await conversationModel.getDirectOtherUserId(conversationId, socket.userId);
        if (!otherId) {
          callback?.({ error: 'Invalid conversation' });
          return;
        }
        io.to(`user-${otherId}`).emit('dm-call-accepted', {
          callId,
          conversationId,
          byUserId: socket.userId,
        });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('dm-call-decline', async (data, callback) => {
      try {
        const { conversationId, callId } = data || {};
        if (!conversationId || !callId) {
          callback?.({ error: 'Invalid' });
          return;
        }
        await assertUserCanUseMessaging(socket);
        const otherId = await conversationModel.getDirectOtherUserId(conversationId, socket.userId);
        if (!otherId) {
          callback?.({ error: 'Invalid conversation' });
          return;
        }
        io.to(`user-${otherId}`).emit('dm-call-ended', { callId, conversationId, reason: 'declined' });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('dm-call-end', async (data, callback) => {
      try {
        const { conversationId, callId } = data || {};
        if (!conversationId || !callId) {
          callback?.({ error: 'Invalid' });
          return;
        }
        await assertUserCanUseMessaging(socket);
        const otherId = await conversationModel.getDirectOtherUserId(conversationId, socket.userId);
        if (!otherId) {
          callback?.({ error: 'Invalid conversation' });
          return;
        }
        io.to(`user-${otherId}`).emit('dm-call-ended', { callId, conversationId, reason: 'ended' });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('dm-call-offer', async (data, callback) => {
      try {
        const { conversationId, callId, sdp } = data || {};
        if (!conversationId || !callId || !sdp) {
          callback?.({ error: 'Invalid' });
          return;
        }
        await assertUserCanUseMessaging(socket);
        const otherId = await conversationModel.getDirectOtherUserId(conversationId, socket.userId);
        if (!otherId) {
          callback?.({ error: 'Invalid conversation' });
          return;
        }
        io.to(`user-${otherId}`).emit('dm-call-offer', { callId, conversationId, sdp, fromUserId: socket.userId });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('dm-call-answer', async (data, callback) => {
      try {
        const { conversationId, callId, sdp } = data || {};
        if (!conversationId || !callId || !sdp) {
          callback?.({ error: 'Invalid' });
          return;
        }
        await assertUserCanUseMessaging(socket);
        const otherId = await conversationModel.getDirectOtherUserId(conversationId, socket.userId);
        if (!otherId) {
          callback?.({ error: 'Invalid conversation' });
          return;
        }
        io.to(`user-${otherId}`).emit('dm-call-answer', { callId, conversationId, sdp, fromUserId: socket.userId });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('dm-call-ice', async (data, callback) => {
      try {
        const { conversationId, callId, candidate } = data || {};
        if (!conversationId || !callId || !candidate) {
          callback?.({ error: 'Invalid' });
          return;
        }
        await assertUserCanUseMessaging(socket);
        const otherId = await conversationModel.getDirectOtherUserId(conversationId, socket.userId);
        if (!otherId) {
          callback?.({ error: 'Invalid conversation' });
          return;
        }
        io.to(`user-${otherId}`).emit('dm-call-ice', { callId, conversationId, candidate, fromUserId: socket.userId });
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: err.message || 'Failed' });
      }
    });

    socket.on('disconnect', () => {
      // Ensure typing indicators don't remain stuck for others.
      Array.from(socket.rooms)
        .filter((r) => r.startsWith('conversation-'))
        .forEach((room) => {
          const conversationId = room.replace('conversation-', '');
          socket.to(room).emit('stop-typing', { userId: socket.userId, conversationId });
        });
      typingTimers.forEach((t, key) => {
        if (key.startsWith(socket.userId + '-')) {
          clearTimeout(t);
          typingTimers.delete(key);
        }
      });
    });
  });
};
