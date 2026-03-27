import * as notificationModel from '../models/notification.model.js';
import * as userModel from '../models/user.model.js';
import * as groupModel from '../models/group.model.js';
import { sendMailWithRetry, isSmtpConfigured } from './emailDelivery.service.js';
import * as templates from '../templates/email/index.js';
import { smtpConfig } from '../config/smtp.js';
import { logger } from '../utils/logger.js';
import { getNotificationIo } from '../config/socketRegistry.js';

const TYPES = {
  ASSIGNMENT: 'assignment',
  BOOKING: 'booking',
  MEETING: 'meeting',
  GROUP: 'group',
  SYSTEM: 'system',
};

/**
 * Persist in-app notification, then send email (async by default; awaitEmail for critical mail).
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = {},
  email,
  emailPayload,
  awaitEmail = false,
}) {
  const row = await notificationModel.create({
    userId,
    type,
    title,
    message,
    metadata,
    emailSent: false,
    emailSentAt: null,
  });

  if (email && emailPayload && isSmtpConfigured()) {
    const send = async () => {
      const { ok } = await sendMailWithRetry({ to: email, ...emailPayload });
      if (ok) {
        await notificationModel.updateEmailSent(row.id);
      }
    };
    if (awaitEmail) {
      try {
        await send();
      } catch (err) {
        logger.warn('notification_email_failed', { err: err.message, id: row.id });
      }
    } else {
      Promise.resolve()
        .then(send)
        .catch((err) => logger.warn('notification_email_async_failed', { err: err.message, id: row.id }));
    }
  } else if (email && emailPayload && !isSmtpConfigured()) {
    logger.info('notification_email_skipped_no_smtp', { userId, type });
  }

  const io = getNotificationIo();
  if (io) {
    io.to(`user-${userId}`).emit('notification', {
      id: row.id,
      type,
      title,
      message,
      createdAt: row.created_at,
    });
  }

  return row;
}

export async function notifyAssignmentCreated({ userId, assignment }) {
  const user = await userModel.findById(userId);
  const name = user?.display_name || user?.email?.split('@')[0] || 'there';
  const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
  const deadlineFormatted = deadline
    ? deadline.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const { subject, html, text } = templates.assignmentCreatedTemplate({
    userName: name,
    title: assignment.title,
    deadlineFormatted,
  });
  return createNotification({
    userId,
    type: TYPES.ASSIGNMENT,
    title: 'Assignment created',
    message: `${assignment.title} — due ${deadlineFormatted}`,
    metadata: { assignmentId: assignment.id },
    email: user?.email,
    emailPayload: { subject, html, text },
  });
}

export async function notifyAssignmentDeadlineReminder({ userId, assignment, email }) {
  const user = await userModel.findById(userId);
  const name = user?.display_name || user?.email?.split('@')[0] || 'there';
  const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
  const deadlineFormatted = deadline
    ? deadline.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const assignmentUrl = `${smtpConfig.frontendUrl.replace(/\/$/, '')}/assignments`;
  const { subject, html, text } = templates.assignmentReminderTemplate({
    userName: name,
    title: assignment.title,
    deadlineFormatted,
    assignmentUrl,
  });
  return createNotification({
    userId,
    type: TYPES.ASSIGNMENT,
    title: 'Assignment due soon',
    message: `${assignment.title} is due ${deadlineFormatted}`,
    metadata: { assignmentId: assignment.id, event: 'deadline_reminder' },
    email: email || user?.email,
    emailPayload: { subject, html, text },
  });
}

export async function notifyBookingCreated(booking) {
  const tutor = await userModel.findById(booking.tutor_user_id);
  const student = await userModel.findById(booking.student_id);
  const start = new Date(booking.start_time);
  const startFormatted = start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const tplStudent = templates.bookingConfirmationTemplate({
    userName: student?.display_name || student?.email,
    role: 'student',
    otherPartyEmail: tutor?.email,
    startFormatted,
    status: 'pending',
  });
  await createNotification({
    userId: booking.student_id,
    type: TYPES.BOOKING,
    title: 'Booking request sent',
    message: `Pending tutor confirmation — ${startFormatted}`,
    metadata: { bookingId: booking.id },
    email: student?.email,
    emailPayload: { subject: tplStudent.subject, html: tplStudent.html, text: tplStudent.text },
  });

  const tplTutor = templates.bookingConfirmationTemplate({
    userName: tutor?.display_name || tutor?.email,
    role: 'tutor',
    otherPartyEmail: student?.email,
    startFormatted,
    status: 'pending',
  });
  await createNotification({
    userId: booking.tutor_user_id,
    type: TYPES.BOOKING,
    title: 'New booking request',
    message: `${student?.email} — ${startFormatted}`,
    metadata: { bookingId: booking.id },
    email: tutor?.email,
    emailPayload: { subject: tplTutor.subject, html: tplTutor.html, text: tplTutor.text },
  });
}

export async function notifyBookingStatusChanged(booking, newStatus) {
  const tutor = await userModel.findById(booking.tutor_user_id);
  const student = await userModel.findById(booking.student_id);
  const start = new Date(booking.start_time);
  const startFormatted = start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  const mk = (userId, email, role) => {
    const t = templates.bookingConfirmationTemplate({
      userName: role === 'student' ? student?.display_name || student?.email : tutor?.display_name || tutor?.email,
      role,
      otherPartyEmail: role === 'student' ? tutor?.email : student?.email,
      startFormatted,
      status: newStatus,
    });
    return createNotification({
      userId,
      type: TYPES.BOOKING,
      title: `Booking ${newStatus}`,
      message: `${startFormatted}`,
      metadata: { bookingId: booking.id, status: newStatus },
      email,
      emailPayload: { subject: t.subject, html: t.html, text: t.text },
    });
  };

  await mk(booking.student_id, student?.email, 'student');
  await mk(booking.tutor_user_id, tutor?.email, 'tutor');
}

export async function notifyMeetingScheduled({ meeting, groupName }) {
  const members = await groupModel.listMembers(meeting.group_id);
  const approved = members.filter((m) => m.status === 'approved');
  const scheduledFormatted = meeting.scheduled_at
    ? new Date(meeting.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  const base = smtpConfig.frontendUrl.replace(/\/$/, '');
  const meetingUrl = `${base}/meetings/${meeting.id}`;

  for (const m of approved) {
    const user = await userModel.findById(m.user_id);
    if (!user?.email) continue;
    const name = user.display_name || user.email;
    const { subject, html, text } = templates.meetingScheduledTemplate({
      userName: name,
      groupName: groupName || 'Study group',
      title: meeting.title,
      scheduledFormatted,
      meetingUrl,
    });
    await createNotification({
      userId: m.user_id,
      type: TYPES.MEETING,
      title: 'Meeting scheduled',
      message: `${groupName || 'Group'}: ${meeting.title || 'Meeting'}${scheduledFormatted ? ` — ${scheduledFormatted}` : ''}`,
      metadata: { meetingId: meeting.id, groupId: meeting.group_id },
      email: user.email,
      emailPayload: { subject, html, text },
    });
  }
}

export async function notifyGroupMemberAdded({ inviteeUserId, groupId, groupName }) {
  const user = await userModel.findById(inviteeUserId);
  if (!user?.email) return null;
  const name = user.display_name || user.email;
  const url = `${smtpConfig.frontendUrl.replace(/\/$/, '')}/groups/${groupId}`;
  const { subject, html, text } = templates.groupInviteTemplate({
    userName: name,
    groupName: groupName || 'Study group',
    inviteUrl: url,
    invitedByName: null,
  });
  return createNotification({
    userId: inviteeUserId,
    type: TYPES.GROUP,
    title: `Added to ${groupName || 'a group'}`,
    message: `You are now a member of ${groupName || 'the group'}.`,
    metadata: { groupId },
    email: user.email,
    emailPayload: { subject, html, text },
    awaitEmail: true,
  });
}

export async function notifyGroupInviteLinkCreated({ creatorUserId, groupName, inviteUrl }) {
  const user = await userModel.findById(creatorUserId);
  if (!user?.email) return null;
  const name = user.display_name || user.email;
  const { subject, html, text } = templates.groupInviteLinkCreatedTemplate({
    userName: name,
    groupName: groupName || 'Study group',
    inviteUrl,
  });
  return createNotification({
    userId: creatorUserId,
    type: TYPES.GROUP,
    title: 'Invite link created',
    message: `Share the link to invite others to ${groupName || 'your group'}.`,
    metadata: { event: 'invite_link' },
    email: user.email,
    emailPayload: { subject, html, text },
  });
}

export async function notifyBookingReminderInApp({ userId, email, startTime, tutorEmail }) {
  const start = new Date(startTime);
  const formatted = start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const { subject, html, text } = templates.bookingSessionReminderTemplate({
    startFormatted: formatted,
    tutorEmail,
  });
  return createNotification({
    userId,
    type: TYPES.BOOKING,
    title: 'Session reminder',
    message: `Your session is at ${formatted}` + (tutorEmail ? ` — Tutor: ${tutorEmail}` : ''),
    metadata: { event: 'booking_reminder' },
    email,
    emailPayload: { subject, html, text },
  });
}

export { TYPES };
