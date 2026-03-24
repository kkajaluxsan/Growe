import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode ?? err.status ?? 500;
  const message = err.message || 'Internal server error';

  logger.error(message, {
    code: err.code,
    statusCode: status,
    path: req?.path,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err.code === '23505') {
    return res.status(409).json({ success: false, error: 'Resource already exists', details: [err.detail] });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, error: 'Invalid reference', details: [err.detail] });
  }
  if (err.code === '23502') {
    return res.status(400).json({ success: false, error: 'Required field missing', details: [err.column] });
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && err.stack && { stack: err.stack }),
  });
};
