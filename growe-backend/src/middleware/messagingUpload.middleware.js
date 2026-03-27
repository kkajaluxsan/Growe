import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { basename } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '../../uploads/messaging');

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const MAX_BYTES = Math.min(
  Number(process.env.MESSAGING_MAX_FILE_MB || 25) * 1024 * 1024,
  50 * 1024 * 1024
);

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = basename(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const name = `${req.user.id}-${Date.now()}-${safe}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed for chat. Use images, PDF, Office docs, zip, or plain text.'), false);
  }
};

export const uploadChatFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES },
}).single('file');
