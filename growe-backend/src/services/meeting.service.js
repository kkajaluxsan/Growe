import * as meetingModel from '../models/meeting.model.js';
import * as groupModel from '../models/group.model.js';
import * as bookingService from './booking.service.js';

export const createMeeting = async ({ groupId, title, createdBy, scheduledAt, tutorId, slot }) => {
  const member = await groupModel.getMember(groupId, createdBy);
  if (!member || member.status !== 'approved') {
    const err = new Error('You must be an approved member of the group to create a meeting');
    err.statusCode = 403;
    throw err;
  }
  if (tutorId && slot?.availabilityId && slot?.startTime && slot?.endTime) {
    await bookingService.createBooking({
      availabilityId: slot.availabilityId,
      studentId: createdBy,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }
  return meetingModel.create({
    groupId,
    title: title || 'Group Meeting',
    createdBy,
    scheduledAt: scheduledAt || null,
    tutorId: tutorId || null,
  });
};
