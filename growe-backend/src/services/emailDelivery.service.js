import { getTransporter, smtpConfig } from '../config/smtp.js';
import { hasResendApiKey, isResendApiConfigured, sendResendEmail } from '../config/resend.js';
import { logger } from '../utils/logger.js';

const DEFAULT_RETRIES = Number(process.env.SMTP_MAX_RETRIES) || 3;
const RETRY_DELAY_MS = Number(process.env.SMTP_RETRY_DELAY_MS) || 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Startup hint: no console/terminal “fake” mail — configure Resend or SMTP or delivery fails. */
export function logDevelopmentEmailStartupHint() {
  if (process.env.NODE_ENV === 'production') return;
  if (!isSmtpConfigured()) {
    console.warn(
      '[growe] Outbound email is not configured (no RESEND_API_KEY and no SMTP_*). Verification and password reset will fail until you set mail env — see growe-backend/.env.example.'
    );
  } else if (isResendApiConfigured()) {
    console.info('[growe] Outbound mail: Resend HTTP API.');
  } else if (hasResendApiKey()) {
    console.info('[growe] Outbound mail: Nodemailer (USE_RESEND_HTTP_API=0).');
  }
}

/**
 * Resend blocks non–account-owner recipients without a verified domain (HTTP 403 or SMTP 550).
 */
function isResendSandboxRejection(err) {
  const meta = err?.resendError || err?.cause;
  const httpStatus = meta?.statusCode;
  if (httpStatus === 403 && meta?.name === 'validation_error') return true;
  const blob = [err?.message, err?.response].filter(Boolean).join(' ');
  if (!/only send testing emails|verify a domain at resend\.com/i.test(blob)) return false;
  if (err?.responseCode === 550 || err?.code === 'EMESSAGE') return true;
  return /only send testing emails/i.test(blob);
}

function isRetryable(err) {
  if (isResendSandboxRejection(err)) return false;
  const code = err?.code || err?.responseCode;
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED') return true;
  if (typeof code === 'number' && code >= 400 && code < 500 && code !== 429) return false;
  return true;
}

/**
 * True when outbound email should be attempted (Resend API or SMTP).
 * Supports Mailpit/MailHog and similar (SMTP_HOST only, no auth) — not only SMTP_USER.
 */
export function isSmtpConfigured() {
  if (process.env.SMTP_DISABLED === '1' || process.env.SMTP_DISABLED === 'true') return false;
  if (isResendApiConfigured()) return true;
  const user = process.env.SMTP_USER && String(process.env.SMTP_USER).trim();
  const host = process.env.SMTP_HOST && String(process.env.SMTP_HOST).trim();
  return Boolean(user || host);
}

async function sendNodemailerWithRetry(
  { to, subject, text, html },
  { retries = DEFAULT_RETRIES } = {}
) {
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
  return { ok: false, error: lastErr };
}

/**
 * Sends email via Resend HTTP or Nodemailer with retries.
 * Does not throw on final failure — returns { ok, error }.
 */
export async function sendMailWithRetry(
  { to, subject, text, html },
  { retries = DEFAULT_RETRIES } = {}
) {
  if (!to || !subject) {
    return { ok: false, error: new Error('Missing to/subject') };
  }

  const smtpOff = process.env.SMTP_DISABLED === '1' || process.env.SMTP_DISABLED === 'true';
  if (smtpOff) {
    return { ok: false, error: new Error('SMTP is disabled') };
  }

  if (isResendApiConfigured()) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await sendResendEmail({ to, subject, text, html });
        return { ok: true };
      } catch (err) {
        lastErr = err;
        logger.warn('email_delivery_resend_attempt_failed', {
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
    logger.error('email_delivery_resend_failed', {
      err: lastErr?.message,
      to: typeof to === 'string' ? to : '[list]',
      resend: lastErr?.cause || lastErr?.resendError,
    });
    const explicitSmtpHost = (process.env.SMTP_HOST || '').trim();
    if (explicitSmtpHost) {
      logger.warn('email_delivery_resend_trying_smtp_fallback', { to: typeof to === 'string' ? to : '[list]' });
      const smtpAfter = await sendNodemailerWithRetry({ to, subject, text, html }, { retries });
      if (smtpAfter.ok) return smtpAfter;
      lastErr = smtpAfter.error || lastErr;
    }
    return { ok: false, error: lastErr };
  }

  const smtpResult = await sendNodemailerWithRetry({ to, subject, text, html }, { retries });
  if (smtpResult.ok) return smtpResult;
  const lastErr = smtpResult.error;

  logger.error('email_delivery_failed', { err: lastErr?.message, to });
  return { ok: false, error: lastErr };
}
