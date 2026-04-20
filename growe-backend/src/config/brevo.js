import { smtpConfig } from './smtp.js';

function env(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

export function getBrevoApiKey() {
  const explicit = env('BREVO_API_KEY');
  if (explicit) return explicit;

  const smtpHost = env('SMTP_HOST').toLowerCase();
  const smtpPass = env('SMTP_PASS');
  if (smtpHost.includes('brevo') && /^xkeysib-/i.test(smtpPass)) {
    return smtpPass;
  }
  return '';
}

export function isBrevoApiConfigured() {
  return !!getBrevoApiKey();
}

function parseFromAddress(rawFrom) {
  const from = (rawFrom || '').trim();
  const m = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) {
    return {
      name: (m[1] || 'GROWE').trim() || 'GROWE',
      email: (m[2] || '').trim(),
    };
  }
  return { name: 'GROWE', email: from };
}

export async function sendBrevoEmail({ to, subject, text, html }) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const sender = parseFromAddress(smtpConfig.from);
  if (!sender.email) {
    throw new Error('SMTP_FROM must be a valid email format for Brevo API sender');
  }

  const toList = Array.isArray(to) ? to : [to];
  const recipients = toList
    .map((addr) => (typeof addr === 'string' ? addr.trim() : ''))
    .filter(Boolean)
    .map((email) => ({ email }));

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender,
      to: recipients,
      subject,
      htmlContent: html || undefined,
      textContent: text || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || data?.code || res.statusText || 'Brevo request failed');
    err.brevoError = data;
    err.statusCode = res.status;
    throw err;
  }

  return data;
}
