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
