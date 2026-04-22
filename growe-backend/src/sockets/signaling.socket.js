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
    if (!user.is_verified) {
      return next(new Error('EMAIL_NOT_VERIFIED'));
    }
    socket.userId = user.id;
    socket.userEmail = user.email;
    socket.userRole = user.role_name;
    next();
  });

  // Track meeting participants for targeted signaling
  const meetingUserSocket = new Map(); // meetingId -> Map(userId -> { socketId, email })

  io.on('connection', (socket) => {
    socket.join(`user-${socket.userId}`);
    if (socket.userRole === 'admin') {
      socket.join('admin-dashboard');
    }

    socket.on('join-focus-room', (data) => {
      if (data?.groupId) socket.join(`focus-group-${data.groupId}`);
    });
    socket.on('leave-focus-room', (data) => {
      if (data?.groupId) socket.leave(`focus-group-${data.groupId}`);
    });
    socket.on('start-focus-timer', (data) => {
      if (data?.groupId && data?.endTime) {
        io.to(`focus-group-${data.groupId}`).emit('focus-timer-started', { endTime: data.endTime });
      }
    });
    socket.on('stop-focus-timer', (data) => {
      if (data?.groupId) {
        io.to(`focus-group-${data.groupId}`).emit('focus-timer-stopped');
      }
    });

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

        const anchor = new Date(meeting.scheduled_at || meeting.created_at).getTime();
        const isExpired = !Number.isNaN(anchor) && Date.now() - anchor > 24 * 60 * 60 * 1000;
        if (meeting.ended_at || isExpired) {
          callback?.({ error: 'This meeting link has expired' });
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
        await meetingModel.markStartedIfNeeded(meetingId);

        if (!meetingUserSocket.has(meetingId)) meetingUserSocket.set(meetingId, new Map());
        const userMap = meetingUserSocket.get(meetingId);
        userMap.set(socket.userId, { socketId: socket.id, email: socket.userEmail });
        const existingParticipants = Array.from(userMap.entries())
          .filter(([uid]) => uid !== socket.userId)
          .map(([uid, info]) => ({ userId: uid, userEmail: info?.email }));

        socket.to(roomName).emit('user-joined', {
          userId: socket.userId,
          userEmail: socket.userEmail,
        });

        callback?.({ success: true, existingParticipants });
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
          const userMap = meetingUserSocket.get(meetingId);
          userMap?.delete(socket.userId);
          if (userMap && userMap.size === 0) meetingUserSocket.delete(meetingId);
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
        const target = meetingUserSocket.get(meetingId)?.get(targetUserId);
        const targetSocketId = target?.socketId;
        if (!targetSocketId) return;
        io.to(targetSocketId).emit('offer', { fromUserId: socket.userId, fromUserEmail: socket.userEmail, sdp });
      }
    });

    socket.on('answer', (data) => {
      const { meetingId, targetUserId, sdp } = data;
      if (meetingId && targetUserId && sdp) {
        const target = meetingUserSocket.get(meetingId)?.get(targetUserId);
        const targetSocketId = target?.socketId;
        if (!targetSocketId) return;
        io.to(targetSocketId).emit('answer', { fromUserId: socket.userId, fromUserEmail: socket.userEmail, sdp });
      }
    });

    socket.on('ice-candidate', (data) => {
      const { meetingId, targetUserId, candidate } = data;
      if (meetingId && targetUserId && candidate) {
        const target = meetingUserSocket.get(meetingId)?.get(targetUserId);
        const targetSocketId = target?.socketId;
        if (!targetSocketId) return;
        io.to(targetSocketId).emit('ice-candidate', { fromUserId: socket.userId, fromUserEmail: socket.userEmail, candidate });
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

    socket.on('whiteboard-draw', (data) => {
      const { meetingId, stroke } = data || {};
      if (meetingId && stroke) {
        socket.to(`meeting-${meetingId}`).emit('whiteboard-draw', { userId: socket.userId, stroke });
      }
    });

    socket.on('whiteboard-clear', (data) => {
      const { meetingId } = data || {};
      if (meetingId) {
        socket.to(`meeting-${meetingId}`).emit('whiteboard-clear', { userId: socket.userId });
      }
    });

    socket.on('disconnect', async () => {
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('meeting-'));
      for (const room of rooms) {
        const meetingId = room.replace('meeting-', '');
        try {
          await meetingModel.setParticipantLeft(meetingId, socket.userId);
          socket.to(room).emit('user-left', { userId: socket.userId });
          const userMap = meetingUserSocket.get(meetingId);
          userMap?.delete(socket.userId);
          if (userMap && userMap.size === 0) meetingUserSocket.delete(meetingId);
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
