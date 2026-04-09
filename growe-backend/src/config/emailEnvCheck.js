import { isSmtpConfigured } from '../services/emailDelivery.service.js';

function isLoopbackSmtpHost() {
  const h = process.env.SMTP_HOST?.trim();
  if (!h) return false;
  return /^(localhost|127\.0\.0\.1)$/i.test(h);
}

function frontendUrlIsLocalOrMissing() {
  const u = process.env.FRONTEND_URL;
  if (!u || !String(u).trim()) return true;
  try {
    const url = new URL(String(u).trim());
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

function strictFail() {
  return process.env.EMAIL_CONFIG_STRICT === '1' || process.env.EMAIL_CONFIG_STRICT === 'true';
}

/**
 * Logs misconfiguration for real verification / password-reset email in production.
 * Set EMAIL_CONFIG_STRICT=1 to exit if outbound mail cannot work as deployed.
 */
export function logProductionEmailConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  const smtpOff = process.env.SMTP_DISABLED === '1' || process.env.SMTP_DISABLED === 'true';
  if (smtpOff) {
    console.warn(
      '[GROWE] SMTP_DISABLED=1 — outbound email is disabled. Not suitable for production sign-up flows that need verification.'
    );
    return;
  }

  if (!isSmtpConfigured()) {
    console.error(
      '[GROWE] Production email: set RESEND_API_KEY (Resend HTTP API) or SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM), and FRONTEND_URL. See .env.example. Verification emails will not send until outbound email is configured.'
    );
    if (strictFail()) process.exit(1);
    return;
  }

  if (isLoopbackSmtpHost()) {
    console.error(
      '[GROWE] Production email: SMTP_HOST must not be localhost — use your provider (SendGrid, AWS SES, Resend, Postmark, Gmail SMTP with app password, etc.). MailDev/Mailpit only work on your machine.'
    );
    if (strictFail()) process.exit(1);
    return;
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS != null ? String(process.env.SMTP_PASS).trim() : '';
  if (process.env.SMTP_HOST?.trim() && (!smtpUser || !smtpPass)) {
    console.error(
      '[GROWE] Production email: set SMTP_USER and SMTP_PASS for your provider (e.g. SendGrid: SMTP_USER=apikey, SMTP_PASS=<API key>). Host alone is not enough for authenticated relay.'
    );
    if (strictFail()) process.exit(1);
    return;
  }

  if (frontendUrlIsLocalOrMissing()) {
    console.error(
      '[GROWE] Production email: set FRONTEND_URL to your live app URL (https://your-domain.com). Verification links in emails use this; localhost breaks links for real users.'
    );
    if (strictFail()) process.exit(1);
  }
}
