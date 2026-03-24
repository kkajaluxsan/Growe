import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import app from './src/app.js';
import { initSignaling } from './src/sockets/signaling.socket.js';
import { initMessaging } from './src/sockets/messaging.socket.js';
import { runBookingReminderJob } from './src/jobs/bookingReminder.job.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

import './src/config/env.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = initSignaling(server);
initMessaging(io);

app.set('io', io);

server.listen(PORT, () => {
  console.log(`GROWE backend running on port ${PORT}`);
  const reminderIntervalMs = 15 * 60 * 1000;
  setInterval(() => {
    runBookingReminderJob().catch((err) => console.error('Booking reminder job error:', err.message));
  }, reminderIntervalMs);
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
