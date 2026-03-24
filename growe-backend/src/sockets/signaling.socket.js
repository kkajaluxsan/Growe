import { Server } from 'socket.io';
import { verifyToken } from '../config/jwt.js';
import * as userModel from '../models/user.model.js';
import * as groupModel from '../models/group.model.js';
import * as meetingModel from '../models/meeting.model.js';

export const initSignaling = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid or expired token'));
    }
    const user = await userModel.findById(decoded.userId);
    if (!user || !user.is_active) {
      return next(new Error('User not found or inactive'));
    }
    socket.userId = user.id;
    socket.userEmail = user.email;
    next();
  });

  io.on('connection', (socket) => {
    socket.on('join-room', async (data, callback) => {
      try {
        const { meetingId } = data;
        if (!meetingId) {
          callback?.({ error: 'Meeting ID required' });
          return;
        }

        const meeting = await meetingModel.findById(meetingId);
        if (!meeting) {
          callback?.({ error: 'Meeting not found' });
          return;
        }

        const member = await groupModel.getMember(meeting.group_id, socket.userId);
        if (!member || member.status !== 'approved') {
          callback?.({ error: 'You must be a group member to join this meeting' });
          return;
        }

        const roomName = `meeting-${meetingId}`;
        await socket.join(roomName);
        await meetingModel.addParticipant(meetingId, socket.userId);

        socket.to(roomName).emit('user-joined', {
          userId: socket.userId,
          userEmail: socket.userEmail,
        });

        callback?.({ success: true });
      } catch (err) {
        console.error('join-room error:', err);
        callback?.({ error: err.message || 'Failed to join room' });
      }
    });

    socket.on('leave-room', async (data, callback) => {
      try {
        const { meetingId } = data;
        if (meetingId) {
          const roomName = `meeting-${meetingId}`;
          await meetingModel.setParticipantLeft(meetingId, socket.userId);
          socket.to(roomName).emit('user-left', { userId: socket.userId });
          socket.leave(roomName);
        }
        callback?.({ success: true });
      } catch (err) {
        console.error('leave-room error:', err);
        callback?.({ error: err.message || 'Failed to leave room' });
      }
    });

    socket.on('offer', (data) => {
      const { meetingId, targetUserId, sdp } = data;
      if (meetingId && targetUserId && sdp) {
        socket.to(`meeting-${meetingId}`).emit('offer', {
          fromUserId: socket.userId,
          sdp,
        });
      }
    });

    socket.on('answer', (data) => {
      const { meetingId, targetUserId, sdp } = data;
      if (meetingId && targetUserId && sdp) {
        socket.to(`meeting-${meetingId}`).emit('answer', {
          fromUserId: socket.userId,
          sdp,
        });
      }
    });

    socket.on('ice-candidate', (data) => {
      const { meetingId, targetUserId, candidate } = data;
      if (meetingId && targetUserId && candidate) {
        socket.to(`meeting-${meetingId}`).emit('ice-candidate', {
          fromUserId: socket.userId,
          candidate,
        });
      }
    });

    socket.on('raise-hand', (data) => {
      const { meetingId } = data || {};
      if (meetingId) {
        io.to(`meeting-${meetingId}`).emit('raise-hand', { userId: socket.userId });
      }
    });

    socket.on('lower-hand', (data) => {
      const { meetingId } = data || {};
      if (meetingId) {
        io.to(`meeting-${meetingId}`).emit('lower-hand', { userId: socket.userId });
      }
    });

    socket.on('speaking', (data) => {
      const { meetingId, active } = data || {};
      if (meetingId) {
        socket.to(`meeting-${meetingId}`).emit('speaking', { userId: socket.userId, active: !!active });
      }
    });

    socket.on('disconnect', async () => {
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('meeting-'));
      for (const room of rooms) {
        const meetingId = room.replace('meeting-', '');
        try {
          await meetingModel.setParticipantLeft(meetingId, socket.userId);
          socket.to(room).emit('user-left', { userId: socket.userId });
        } catch (err) {
          console.error('Disconnect cleanup error:', err);
        }
      }
    });
  });

  return io;
};

export const emitMeetingTerminated = (io, meetingId) => {
  if (io) {
    io.to(`meeting-${meetingId}`).emit('meeting-terminated', { meetingId });
  }
};
