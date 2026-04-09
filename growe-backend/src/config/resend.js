import { Resend } from 'resend';
import dotenv from 'dotenv';
import { smtpConfig } from './smtp.js';

dotenv.config();

let client;

const RESEND_KEY_PLACEHOLDER = 're_xxxxxxxxx';

/** When using Resend over SMTP, the same `re_…` value is SMTP_PASS — no need to duplicate RESEND_API_KEY. */
function resendKeyFromMatchingSmtp() {
  const host = (process.env.SMTP_HOST || '').trim().toLowerCase();
  const user = (process.env.SMTP_USER || '').trim().toLowerCase();
  const pass = (process.env.SMTP_PASS != null ? String(process.env.SMTP_PASS) : '').trim();
  if (!pass || user !== 'resend' || !host.includes('smtp.resend.com')) return '';
  if (pass === RESEND_KEY_PLACEHOLDER) return '';
  if (!/^re_[A-Za-z0-9_]+$/.test(pass)) return '';
  return pass;
}

export function getResendApiKey() {
  const direct = process.env.RESEND_API_KEY != null ? String(process.env.RESEND_API_KEY).trim() : '';
  if (direct) {
    if (direct === RESEND_KEY_PLACEHOLDER) return '';
    return direct;
  }
  return resendKeyFromMatchingSmtp();
}

/** True when a Resend API key is present (for logging/diagnostics). */
export function hasResendApiKey() {
  return Boolean(getResendApiKey());
}

/**
 * Use Resend's HTTP API for outbound mail. When false, Nodemailer uses SMTP_* instead.
 * SMTP_DISABLED turns all outbound off.
 *
 * Default: when a Resend API key is available, use the HTTP API (correct for verified domains on Resend).
 *
 * USE_RESEND_HTTP_API=0 — use Nodemailer only (SMTP_*).
 */
export function isResendApiConfigured() {
  if (process.env.SMTP_DISABLED === '1' || process.env.SMTP_DISABLED === 'true') return false;
  const key = getResendApiKey();
  if (!key) return false;
  const force = (process.env.USE_RESEND_HTTP_API || '').trim().toLowerCase();
  if (force === '0' || force === 'false') return false;
  return true;
}

export function getResendClient() {
  if (!isResendApiConfigured()) return null;
  if (!client) {
    client = new Resend(getResendApiKey());
  }
  return client;
}

/**
 * Resend API expects `Display Name <addr>` without extra wrapping quotes.
 * .env often uses SMTP_FROM="GROWE" <onboarding@resend.dev> which parses to a leading " on the name.
 */
export function normalizeFromForResend(raw) {
  const s = (raw || '').trim();
  if (!s) return s;
  const m = s.match(/^"([^"]*)"\s*(<[^>]+>)\s*$/);
  if (m) return `${m[1].trim()} ${m[2]}`;
  return s;
}

/** Verified sender in Resend (defaults to SMTP_FROM). */
export function getResendFrom() {
  const f = process.env.RESEND_FROM?.trim();
  const raw = f || smtpConfig.from;
  return normalizeFromForResend(raw);
}

function formatResendApiError(error) {
  if (error == null) return 'Resend API error';
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string') return error.message;
  if (Array.isArray(error.message)) {
    return error.message.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('; ');
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Resend API error';
  }
}

/**
 * @param {{ to: string; subject: string; text?: string; html?: string }} opts
 */
export async function sendResendEmail({ to, subject, text, html }) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error('Resend is not configured');
  }
  const { data, error } = await resend.emails.send({
    from: getResendFrom(),
    to,
    subject,
    html: html || undefined,
    text: text || undefined,
  });
  if (error) {
    const msg = formatResendApiError(error);
    const err = new Error(msg);
    err.cause = error;
    err.resendError = error;
    throw err;
  }
  return data;
}
