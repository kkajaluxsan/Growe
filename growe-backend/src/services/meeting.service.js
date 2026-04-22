import * as meetingModel from '../models/meeting.model.js';
import * as groupModel from '../models/group.model.js';
import * as bookingService from './booking.service.js';
import * as notificationService from './notification.service.js';
import { isPast } from '../utils/timeUtils.js';

export const createMeeting = async ({ groupId, title, createdBy, scheduledAt, tutorId, slot }) => {
  const member = await groupModel.getMember(groupId, createdBy);
  if (!member || member.status !== 'approved') {
    const err = new Error('You must be an approved member of the group to create a meeting');
    err.statusCode = 403;
    throw err;
  }
  if (scheduledAt) {
    const dt = new Date(scheduledAt);
    if (!Number.isNaN(dt.getTime()) && isPast(dt)) {
      const err = new Error('Meeting scheduled time must be in the future');
      err.statusCode = 400;
      throw err;
    }
  }
  if (tutorId && slot?.availabilityId && slot?.startTime && slot?.endTime) {
    await bookingService.createBooking({
      availabilityId: slot.availabilityId,
      studentId: createdBy,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }
  const meeting = await meetingModel.create({
    groupId,
    title: title || 'Group Meeting',
    createdBy,
    scheduledAt: scheduledAt || null,
    tutorId: tutorId || null,
  });
  const group = await groupModel.findById(groupId);
  Promise.resolve()
    .then(() =>
      notificationService.notifyMeetingScheduled({
        meeting,
        groupName: group?.name,
      })
    )
    .catch(() => {});
  return meeting;
};

export const endMeeting = async (meetingId) => {
  const meeting = await meetingModel.findById(meetingId);
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }

  // End the meeting in DB
  const terminated = await meetingModel.terminateMeeting(meetingId);

  // If there was a tutor, handle booking completion and rating prompts
  if (meeting.tutor_id) {
    const invite = await (await import('../models/groupTutorInvite.model.js')).findLatestByGroupId(meeting.group_id);
    if (invite && invite.meeting_id === meetingId && invite.booking_id) {
      // Mark the booking as completed
      await bookingService.updateBookingStatus(invite.booking_id, 'completed', 'tutor');

      // Notify all group members to rate
      const members = await groupModel.listMembers(meeting.group_id);
      const approvedMembers = members.filter((m) => m.status === 'approved');
      
      const tutor = await (await import('../models/user.model.js')).findById(invite.tutor_user_id);
      
      for (const m of approvedMembers) {
        // Skip the tutor themselves if they are a member
        if (m.user_id === invite.tutor_user_id) continue;

        await notificationService.notifyRatingPrompt({
          studentUserId: m.user_id,
          tutorEmail: tutor?.email,
          bookingId: invite.booking_id,
        });
      }
    }
  }

  return terminated;
};
