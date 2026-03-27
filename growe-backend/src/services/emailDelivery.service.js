import { getTransporter, smtpConfig } from '../config/smtp.js';
import { logger } from '../utils/logger.js';

const DEFAULT_RETRIES = Number(process.env.SMTP_MAX_RETRIES) || 3;
const RETRY_DELAY_MS = Number(process.env.SMTP_RETRY_DELAY_MS) || 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err) {
  const code = err?.code || err?.responseCode;
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED') return true;
  if (typeof code === 'number' && code >= 400 && code < 500 && code !== 429) return false;
  return true;
}

/**
 * Sends email via Nodemailer with exponential backoff retries.
 * Does not throw on final failure — returns { ok, error } so callers can decide.
 */
export async function sendMailWithRetry(
  { to, subject, text, html },
  { retries = DEFAULT_RETRIES } = {}
) {
  if (!to || !subject) {
    return { ok: false, error: new Error('Missing to/subject') };
  }
  const transporter = getTransporter();
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await transporter.sendMail({
        from: smtpConfig.from,
        to,
        subject,
        text: text || undefined,
        html: html || undefined,
      });
      return { ok: true };
    } catch (err) {
      lastErr = err;
      logger.warn('email_delivery_attempt_failed', {
        err: err.message,
        attempt,
        to: typeof to === 'string' ? to : '[list]',
      });
      if (attempt < retries && isRetryable(err)) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }
  logger.error('email_delivery_failed', { err: lastErr?.message, to });
  return { ok: false, error: lastErr };
}

/**
 * True when outbound email should be attempted.
 * Supports Mailpit/MailHog and similar (SMTP_HOST only, no auth) — not only SMTP_USER.
 */
export function isSmtpConfigured() {
  if (process.env.SMTP_DISABLED === '1' || process.env.SMTP_DISABLED === 'true') return false;
  const user = process.env.SMTP_USER && String(process.env.SMTP_USER).trim();
  const host = process.env.SMTP_HOST && String(process.env.SMTP_HOST).trim();
  return Boolean(user || host);
}
