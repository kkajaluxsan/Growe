import './src/bootstrap-env.js';
import './src/config/env.js';
import http from 'http';
import app from './src/app.js';
import cron from 'node-cron';
import { initSignaling } from './src/sockets/signaling.socket.js';
import { initMessaging } from './src/sockets/messaging.socket.js';
import { setNotificationIo } from './src/config/socketRegistry.js';
import { runBookingReminderJob } from './src/jobs/bookingReminder.job.js';
import { runBookingImminentReminderJob } from './src/jobs/bookingImminentReminder.job.js';
import { runAssignmentDeadlineReminderJob } from './src/jobs/assignmentReminder.job.js';
import { hasAnyAiProvider } from './src/config/aiEnv.js';
import { logProductionEmailConfig } from './src/config/emailEnvCheck.js';
import { logDevelopmentEmailStartupHint } from './src/services/emailDelivery.service.js';

const PORT = process.env.PORT || 5001;
/** Dev default 127.0.0.1 matches Vite proxy; production uses 0.0.0.0 unless LISTEN_HOST is set. */
const LISTEN_HOST =
  process.env.LISTEN_HOST?.trim() ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

const server = http.createServer(app);

const io = initSignaling(server);
setNotificationIo(io);
initMessaging(io);

app.set('io', io);

server.listen(PORT, LISTEN_HOST, () => {
  console.log(`GROWE backend running on http://${LISTEN_HOST}:${PORT}`);
  logDevelopmentEmailStartupHint();
  logProductionEmailConfig();
  if (!hasAnyAiProvider()) {
    console.warn(
      '[GROWE] AI assistant is disabled: set GEMINI_API_KEY, GROQ_API_KEY (free tier), and/or OPENAI_API_KEY in growe-backend/.env (see .env.example).'
    );
  }
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
    console.warn(
      '[GROWE] Google sign-in is disabled until GOOGLE_CLIENT_ID is set in growe-backend/.env (same Web client ID as VITE_GOOGLE_CLIENT_ID in growe-frontend/.env).'
    );
  }
  const reminderIntervalMs = 15 * 60 * 1000;
  setInterval(() => {
    runBookingReminderJob().catch((err) => console.error('Booking reminder job error:', err.message));
  }, reminderIntervalMs);
  const imminentIntervalMs = 60 * 1000;
  setInterval(() => {
    runBookingImminentReminderJob().catch((err) =>
      console.error('Booking imminent reminder job error:', err.message)
    );
  }, imminentIntervalMs);
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
