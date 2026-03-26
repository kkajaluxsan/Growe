import * as conversationModel from '../models/conversation.model.js';
import * as messageModel from '../models/message.model.js';
import * as userModel from '../models/user.model.js';
import * as tutorModel from '../models/tutor.model.js';
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
        const { conversationId, content } = data;
        if (!conversationId || content == null) {
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
        const sanitized = sanitizeMessageContent(String(content));
        if (sanitized.length < 1 || sanitized.length > MAX_MESSAGE_LENGTH) {
          callback?.({ error: 'Invalid message length' });
          return;
        }
        const message = await messageModel.create({
          conversationId,
          senderId: socket.userId,
          content: sanitized,
          messageType: 'TEXT',
        });
        const full = await messageModel.findById(message.id);
        socket.to(`conversation-${conversationId}`).emit('receive-message', full);
        callback?.({ success: true, message: full });
      } catch (err) {
        callback?.({ error: err.message || 'Failed to send' });
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
        const existing = await messageModel.findById(messageId);
        if (!existing || existing.sender_id !== socket.userId) {
          callback?.({ error: 'Message not found or access denied' });
          return;
        }
        const sanitized = sanitizeMessageContent(String(content));
        if (sanitized.length < 1 || sanitized.length > MAX_MESSAGE_LENGTH) {
          callback?.({ error: 'Invalid message length' });
          return;
        }
        const updated = await messageModel.updateContent(messageId, socket.userId, sanitized);
        if (!updated) {
          callback?.({ error: 'Update failed' });
          return;
        }
        const full = await messageModel.findById(messageId);
        io.to(`conversation-${existing.conversation_id}`).emit('message-edited', full);
        callback?.({ success: true, message: full });
      } catch (err) {
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
        if (!existing || existing.sender_id !== socket.userId) {
          callback?.({ error: 'Message not found or access denied' });
          return;
        }
        await messageModel.softDelete(messageId, socket.userId);
        io.to(`conversation-${existing.conversation_id}`).emit('message-deleted', { messageId, conversationId: existing.conversation_id });
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
