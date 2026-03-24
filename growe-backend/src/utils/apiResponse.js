export const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

export const created = (res, data) => {
  return res.status(201).json({ success: true, data });
};

export const noContent = (res) => {
  return res.status(204).send();
};

export const error = (res, message, statusCode = 400, details = null) => {
  const payload = { success: false, error: message };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
};

export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
