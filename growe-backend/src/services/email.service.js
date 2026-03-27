import { smtpConfig } from '../config/smtp.js';
import { sendMailWithRetry } from './emailDelivery.service.js';
import { passwordResetTemplate } from '../templates/email/index.js';

export const sendVerificationEmail = async ({ email, token, expiresIn = '24 hours' }) => {
  const base = smtpConfig.frontendUrl.replace(/\/$/, '');
  const verificationUrl = `${base}/verify-email?token=${encodeURIComponent(token)}`;

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

  const { ok, error } = await sendMailWithRetry({
    to: email,
    subject: 'Verify your GROWE account',
    text,
    html,
  });
  if (!ok) {
    console.error('Verification email send failed:', error);
    throw error || new Error('Failed to send verification email');
  }
  return { success: true };
};

export const sendPasswordResetEmail = async ({ email, token, expiresIn = '1 hour' }) => {
  const resetUrl = `${smtpConfig.frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = passwordResetTemplate({ resetUrl, expiresIn });
  const { ok, error } = await sendMailWithRetry({ to: email, subject, html, text });
  if (!ok) throw error || new Error('Failed to send password reset email');
  return { success: true };
};
