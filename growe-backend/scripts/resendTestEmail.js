/**
 * One-off test for Resend (same idea as their quickstart).
 * From repo root: cd growe-backend && npm run resend:test
 *
 * Uses RESEND_API_KEY, or the same re_… key already set as SMTP_PASS for Resend SMTP.
 */
import 'dotenv/config';
import { Resend } from 'resend';
import { getResendApiKey } from '../src/config/resend.js';

const key = getResendApiKey();
if (!key) {
  console.error(
    'No Resend API key found. Set RESEND_API_KEY in .env, or use Resend SMTP (SMTP_HOST=smtp.resend.com, SMTP_USER=resend, SMTP_PASS=re_…). Replace re_xxxxxxxxx with your real key from https://resend.com/api-keys'
  );
  process.exit(1);
}

const resend = new Resend(key);
const to = (process.env.RESEND_TEST_TO || 'growelearnning@gmail.com').trim();
const from = (process.env.RESEND_TEST_FROM || 'onboarding@resend.dev').trim();

const { data, error } = await resend.emails.send({
  from,
  to,
  subject: 'Hello World',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
});

if (error) {
  console.error(error);
  process.exit(1);
}
console.log('Resend OK:', data);
