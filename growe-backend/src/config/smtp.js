import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export const getTransporter = () => transporter;

export const smtpConfig = {
  from: process.env.SMTP_FROM || '"GROWE" <noreply@growe.edu>',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
