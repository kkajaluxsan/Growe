import { getTransporter, smtpConfig } from '../config/smtp.js';

export const sendVerificationEmail = async ({ email, token, expiresIn = '24 hours' }) => {
  const transporter = getTransporter();
  const verificationUrl = `${smtpConfig.frontendUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white !important; text-decoration: none; border-radius: 6px; margin: 16px 0; }
        .footer { margin-top: 24px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Verify your GROWE account</h2>
        <p>Thank you for registering with GROWE. Please verify your email address by clicking the button below.</p>
        <p><a href="${verificationUrl}" class="button">Verify Email</a></p>
        <p>Or copy this link: ${verificationUrl}</p>
        <p>This link will expire in ${expiresIn}.</p>
        <div class="footer">
          <p>If you did not create an account, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Verify your GROWE account by visiting: ${verificationUrl}\n\nThis link expires in ${expiresIn}.`;

  try {
    await transporter.sendMail({
      from: smtpConfig.from,
      to: email,
      subject: 'Verify your GROWE account',
      text,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('Email send failed:', err);
    throw err;
  }
};

export const sendPasswordResetEmail = async ({ email, token, expiresIn = '1 hour' }) => {
  const transporter = getTransporter();
  const resetUrl = `${smtpConfig.frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #0f766e; color: white !important; text-decoration: none; border-radius: 6px; margin: 16px 0; }
        .footer { margin-top: 24px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Reset your GROWE password</h2>
        <p>We received a request to reset your password. Click the button below to choose a new password.</p>
        <p><a href="${resetUrl}" class="button">Reset Password</a></p>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link will expire in ${expiresIn}.</p>
        <div class="footer">
          <p>If you did not request a password reset, you can ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Reset your GROWE password: ${resetUrl}\n\nThis link expires in ${expiresIn}.`;
  await transporter.sendMail({
    from: smtpConfig.from,
    to: email,
    subject: 'Reset your GROWE password',
    text,
    html,
  });
  return { success: true };
};

export const sendBookingReminder = async ({ email, startTime, tutorEmail }) => {
  const transporter = getTransporter();
  const start = new Date(startTime);
  const formatted = start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .footer { margin-top: 24px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>GROWE – Booking reminder</h2>
        <p>This is a reminder that you have a tutoring session scheduled for <strong>${formatted}</strong>.</p>
        ${tutorEmail ? `<p>Tutor: ${tutorEmail}</p>` : ''}
        <p>Please be on time. If you need to cancel, do so from your GROWE dashboard.</p>
        <div class="footer">
          <p>You received this because you have a booking on GROWE.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `GROWE – Booking reminder: Your session is scheduled for ${formatted}.${tutorEmail ? ` Tutor: ${tutorEmail}.` : ''}`;
  try {
    await transporter.sendMail({
      from: smtpConfig.from,
      to: email,
      subject: 'GROWE – Booking reminder',
      text,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('Booking reminder email failed:', err);
    throw err;
  }
};
