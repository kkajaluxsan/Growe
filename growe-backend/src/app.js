import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { issueCsrfToken, validateCsrf } from './middleware/csrf.middleware.js';
import authRoutes from './routes/auth.routes.js';
import groupRoutes from './routes/group.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import tutorRoutes from './routes/tutor.routes.js';
import tutorAvailabilityAliasRoutes from './routes/tutorAvailabilityAlias.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import adminRoutes from './routes/admin.routes.js';
import messagingRoutes from './routes/messaging.routes.js';
import aiRoutes from './routes/ai.routes.js';
import usersRoutes from './routes/users.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiEnvelope } from './middleware/apiEnvelope.middleware.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(cookieParser());
app.use(apiEnvelope);

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.get('/api/csrf-token', issueCsrfToken);
app.use('/api/', validateCsrf);

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/tutor', tutorAvailabilityAliasRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const pool = (await import('./config/db.js')).default;
    await pool.query('SELECT 1');
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (e) {
    return res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// Keep messaging routes after public endpoints like /api/health
app.use('/api', messagingRoutes);

app.use(errorHandler);

export default app;
