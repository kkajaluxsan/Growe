import { smtpConfig } from '../../config/smtp.js';

const baseHtml = (body) => `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .button { display: inline-block; padding: 12px 24px; background: #0d9488; color: white !important; text-decoration: none; border-radius: 6px; margin: 16px 0; }
  .footer { margin-top: 24px; font-size: 12px; color: #666; }
</style></head><body><div class="container">${body}</div></body></html>`;

export function assignmentReminderTemplate({ userName, title, deadlineFormatted, assignmentUrl }) {
  const name = userName || 'there';
  const url = assignmentUrl || `${smtpConfig.frontendUrl.replace(/\/$/, '')}/assignments`;
  const inner = `
    <h2>Assignment due soon</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your assignment <strong>${escapeHtml(title)}</strong> is due on <strong>${escapeHtml(deadlineFormatted)}</strong>.</p>
    <p><a href="${url}" class="button">Open in GROWE</a></p>
    <div class="footer"><p>You’re receiving this because you have an assignment on GROWE.</p></div>`;
  return {
    subject: `Reminder: “${title}” is due soon`,
    html: baseHtml(inner),
    text: `Hi ${name}, assignment "${title}" is due ${deadlineFormatted}. Open: ${url}`,
  };
}

export function assignmentCreatedTemplate({ userName, title, deadlineFormatted }) {
  const name = userName || 'there';
  const inner = `
    <h2>Assignment created</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>You created <strong>${escapeHtml(title)}</strong> with deadline <strong>${escapeHtml(deadlineFormatted)}</strong>.</p>
    <div class="footer"><p>GROWE Academic Collaboration</p></div>`;
  return {
    subject: `Assignment created: ${title}`,
    html: baseHtml(inner),
    text: `Hi ${name}, you created "${title}" due ${deadlineFormatted}.`,
  };
}

export function bookingSessionReminderTemplate({ startFormatted, tutorEmail }) {
  const inner = `
    <h2>Session reminder</h2>
    <p>Your tutoring session is scheduled for <strong>${escapeHtml(startFormatted)}</strong>.</p>
    ${tutorEmail ? `<p>Tutor: ${escapeHtml(tutorEmail)}</p>` : ''}
    <div class="footer"><p>GROWE</p></div>`;
  return {
    subject: `Reminder: session at ${startFormatted}`,
    html: baseHtml(inner),
    text: `Reminder: tutoring session at ${startFormatted}.${tutorEmail ? ` Tutor: ${tutorEmail}.` : ''}`,
  };
}

export function tutorSessionReminderTemplate({ startFormatted, studentEmail }) {
  const inner = `
    <h2>Session reminder</h2>
    <p>You have a tutoring session at <strong>${escapeHtml(startFormatted)}</strong>.</p>
    ${studentEmail ? `<p>Student: ${escapeHtml(studentEmail)}</p>` : ''}
    <div class="footer"><p>GROWE</p></div>`;
  return {
    subject: `Reminder: tutoring session at ${startFormatted}`,
    html: baseHtml(inner),
    text: `Reminder: tutoring session at ${startFormatted}.${studentEmail ? ` Student: ${studentEmail}.` : ''}`,
  };
}

export function bookingConfirmationTemplate({ userName, role, otherPartyEmail, startFormatted, status }) {
  const name = userName || 'there';
  const bookingsUrl = `${smtpConfig.frontendUrl.replace(/\/$/, '')}/tutors`;
  const inner = `
    <h2>Booking ${escapeHtml(status)}</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your tutoring booking is <strong>${escapeHtml(status)}</strong>.</p>
    <p><strong>When:</strong> ${escapeHtml(startFormatted)}</p>
    ${otherPartyEmail ? `<p><strong>${role === 'student' ? 'Tutor' : 'Student'}:</strong> ${escapeHtml(otherPartyEmail)}</p>` : ''}
    <p><a href="${bookingsUrl}" class="button">Open bookings in GROWE</a></p>
    <p style="font-size:13px;word-break:break-all;"><a href="${bookingsUrl}">${bookingsUrl}</a></p>
    <div class="footer"><p>Manage bookings in GROWE.</p></div>`;
  return {
    subject: `Booking ${status} — ${startFormatted}`,
    html: baseHtml(inner),
    text: `Booking ${status} at ${startFormatted}.${otherPartyEmail ? ` ${role === 'student' ? 'Tutor' : 'Student'}: ${otherPartyEmail}.` : ''}\n\nOpen bookings: ${bookingsUrl}`,
  };
}

export function meetingScheduledTemplate({ userName, groupName, title, scheduledFormatted, meetingUrl }) {
  const name = userName || 'there';
  const url = meetingUrl || `${smtpConfig.frontendUrl.replace(/\/$/, '')}/meetings`;
  const inner = `
    <h2>Meeting scheduled</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>A meeting was scheduled for group <strong>${escapeHtml(groupName)}</strong>.</p>
    <p><strong>${escapeHtml(title || 'Group meeting')}</strong></p>
    ${scheduledFormatted ? `<p><strong>When:</strong> ${escapeHtml(scheduledFormatted)}</p>` : ''}
    <p><a href="${url}" class="button">Join meeting</a></p>
    <p style="font-size:13px;word-break:break-all;margin-top:12px;">If the button does not work, open this link:<br/><a href="${url}">${url}</a></p>
    <div class="footer"><p>GROWE</p></div>`;
  return {
    subject: `Meeting scheduled: ${groupName}`,
    html: baseHtml(inner),
    text: `Meeting for ${groupName}: ${title || 'Group meeting'}${scheduledFormatted ? ` at ${scheduledFormatted}` : ''}.\n\nJoin: ${url}`,
  };
}

export function groupInviteTemplate({ userName, groupName, inviteUrl, invitedByName }) {
  const name = userName || 'there';
  const url = inviteUrl || smtpConfig.frontendUrl;
  const inner = `
    <h2>You’ve been added to a study group</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>${invitedByName ? `${escapeHtml(invitedByName)} added you to` : 'You were added to'} <strong>${escapeHtml(groupName)}</strong> on GROWE.</p>
    <p><a href="${url}" class="button">Open GROWE</a></p>
    <div class="footer"><p>If you didn’t expect this, contact your administrator.</p></div>`;
  return {
    subject: `You’re in “${groupName}” on GROWE`,
    html: baseHtml(inner),
    text: `Hi ${name}, you were added to ${groupName}. Open: ${url}`,
  };
}

export function groupInviteLinkCreatedTemplate({ userName, groupName, inviteUrl }) {
  const name = userName || 'there';
  const inner = `
    <h2>Invite link ready</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Share this link to invite people to <strong>${escapeHtml(groupName)}</strong>:</p>
    <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    <div class="footer"><p>Link may expire per group settings.</p></div>`;
  return {
    subject: `Invite link for ${groupName}`,
    html: baseHtml(inner),
    text: `Invite link for ${groupName}: ${inviteUrl}`,
  };
}

export function passwordResetTemplate({ resetUrl, expiresIn = '1 hour' }) {
  const inner = `
    <h2>Reset your GROWE password</h2>
    <p>We received a request to reset your password. Click the button below to choose a new password.</p>
    <p><a href="${resetUrl}" class="button">Reset Password</a></p>
    <p>Or copy this link: ${resetUrl}</p>
    <p>This link will expire in ${escapeHtml(expiresIn)}.</p>
    <div class="footer"><p>If you did not request a password reset, you can ignore this email.</p></div>`;
  return {
    subject: 'Reset your GROWE password',
    html: baseHtml(inner),
    text: `Reset your GROWE password: ${resetUrl}\n\nThis link expires in ${expiresIn}.`,
  };
}

export function accountRemovedTemplate({ userName }) {
  const name = userName || 'there';
  const inner = `
    <h2>Your GROWE account has been removed</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>We are writing to inform you that your account on GROWE has been removed by an administrator.</p>
    <p>If you believe this was done in error or if you have any questions, please reply to this email or contact our support team.</p>
    <div class="footer"><p>GROWE Administration</p></div>`;
  return {
    subject: 'Your GROWE account has been removed',
    html: baseHtml(inner),
    text: `Hi ${name},\n\nWe are writing to inform you that your account on GROWE has been removed by an administrator.\n\nIf you believe this was done in error or if you have any questions, please reply to this email or contact our support team.\n\nGROWE Administration`,
  };
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
