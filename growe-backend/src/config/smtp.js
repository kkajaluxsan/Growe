import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const smtpHostRaw = process.env.SMTP_HOST ? String(process.env.SMTP_HOST).trim() : 'localhost';
const smtpUserEarly = process.env.SMTP_USER ? String(process.env.SMTP_USER).trim() : '';

let port = parseInt(process.env.SMTP_PORT || '587', 10);
const isLoopbackHost = /^(localhost|127\.0\.0\.1)$/i.test(smtpHostRaw);
/** Local dev: Mailpit/MailHog listen on 1025 without auth; nothing usually listens on :587. Skipped in production. */
if (
  process.env.NODE_ENV !== 'production' &&
  isLoopbackHost &&
  !smtpUserEarly &&
  port === 587 &&
  process.env.SMTP_FORCE_LOCAL_PORT !== '1' &&
  process.env.SMTP_FORCE_LOCAL_PORT !== 'true'
) {
  port = 1025;
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[growe] SMTP: loopback host with port 587 and no SMTP_USER — using 1025 (Mailpit/MailHog). Set SMTP_PORT=1025 or SMTP_FORCE_LOCAL_PORT=1 to override.'
    );
  }
}

const rawSecure = process.env.SMTP_SECURE;

/**
 * Port 587 = submission with STARTTLS (upgrade). Nodemailer expects secure:false.
 * Port 465 = implicit TLS (SSL). Expects secure:true.
 * Mis-setting SMTP_SECURE=true with port 587 breaks Gmail, Outlook, SendGrid, etc.
 */
let secure = false;
if (rawSecure === 'true') {
  secure = port === 465;
} else if (rawSecure === 'false') {
  secure = false;
} else {
  secure = port === 465;
}
if (port === 587 && rawSecure === 'true') {
  secure = false;
}

const smtpUser = smtpUserEarly;
const smtpPass =
  process.env.SMTP_PASS !== undefined && process.env.SMTP_PASS !== null
    ? String(process.env.SMTP_PASS).trim()
    : '';

const transporter = nodemailer.createTransport({
  host: smtpHostRaw,
  port,
  secure,
  requireTLS: port === 587 && !secure,
  auth: smtpUser
    ? {
        user: smtpUser,
        pass: smtpPass,
      }
    : undefined,
});

export const getTransporter = () => transporter;

export const smtpConfig = {
  from: process.env.SMTP_FROM || '"GROWE" <noreply@growe.edu>',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
