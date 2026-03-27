import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import app from './src/app.js';
import cron from 'node-cron';
import { initSignaling } from './src/sockets/signaling.socket.js';
import { initMessaging } from './src/sockets/messaging.socket.js';
import { setNotificationIo } from './src/config/socketRegistry.js';
import { runBookingReminderJob } from './src/jobs/bookingReminder.job.js';
import { runAssignmentDeadlineReminderJob } from './src/jobs/assignmentReminder.job.js';
import { isSmtpConfigured } from './src/services/emailDelivery.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

import './src/config/env.js';

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

const io = initSignaling(server);
setNotificationIo(io);
initMessaging(io);

app.set('io', io);

server.listen(PORT, () => {
  console.log(`GROWE backend running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production' && !isSmtpConfigured()) {
    console.warn(
      '[GROWE] Email: SMTP is not configured (set SMTP_HOST or SMTP_USER, or use SMTP_DISABLED=1 only if you intentionally skip outbound mail). Verification and notification emails will not be sent.'
    );
  }
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    console.warn(
      '[GROWE] FRONTEND_URL is unset. Verification links in emails default to localhost — set FRONTEND_URL to your public app URL (https://…).'
    );
  }
  const reminderIntervalMs = 15 * 60 * 1000;
  setInterval(() => {
    runBookingReminderJob().catch((err) => console.error('Booking reminder job error:', err.message));
  }, reminderIntervalMs);
  cron.schedule('0 * * * *', () => {
    runAssignmentDeadlineReminderJob().catch((err) =>
      console.error('Assignment deadline reminder job error:', err.message)
    );
  });
});

function gracefulShutdown(signal) {
  console.log(`${signal} received, closing server...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
