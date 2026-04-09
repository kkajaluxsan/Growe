import Joi from 'joi';

/** API / UI labels → DB integers */
export const PRIORITY_TO_DB = { LOW: 1, MEDIUM: 2, HIGH: 3 };
export const DB_TO_PRIORITY_LABEL = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' };

/** API accepts SCREAMING_SNAKE; DB stores lowercase */
export const STATUS_TO_DB = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export const DB_STATUS_VALUES = ['pending', 'in_progress', 'completed'];

const statusApi = Joi.string()
  .uppercase()
  .valid('PENDING', 'IN_PROGRESS', 'COMPLETED')
  .messages({ 'any.only': 'Status must be PENDING, IN_PROGRESS, or COMPLETED' });

const priorityApi = Joi.string()
  .uppercase()
  .valid('LOW', 'MEDIUM', 'HIGH')
  .messages({ 'any.only': 'Priority must be LOW, MEDIUM, or HIGH' });

const futureDeadline = Joi.date()
  .required()
  .custom((value, helpers) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      return helpers.error('any.invalid');
    }
    if (d.getTime() <= Date.now()) {
      return helpers.message('Deadline must be after the current date and time');
    }
    return d;
  })
  .messages({
    'date.base': 'Deadline must be a valid date',
    'any.required': 'Deadline is required',
  });

const titleSchema = Joi.string()
  .trim()
  .min(1)
  .max(255)
  .required()
  .messages({
    'string.empty': 'Title is required',
    'any.required': 'Title is required',
  });

const descriptionSchema = Joi.string()
  .trim()
  .min(1)
  .max(10000)
  .required()
  .messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
  });

export const assignmentCreateSchema = Joi.object({
  title: titleSchema,
  description: descriptionSchema,
  deadline: futureDeadline,
  status: statusApi.default('PENDING'),
  priority: priorityApi.default('MEDIUM'),
  /** Admin only: show to all students/tutors (enforced in service). */
  visibleToAll: Joi.boolean().optional(),
})
  .unknown(false)
  .messages({ 'object.unknown': 'Unknown field {#label} is not allowed' });

/** Update: date shape only; service allows unchanged past deadlines (overdue rows). */
const optionalDeadlineOnUpdate = Joi.date().messages({ 'date.base': 'Deadline must be a valid date' });

export const assignmentUpdateSchema = Joi.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  deadline: optionalDeadlineOnUpdate.optional(),
  status: statusApi.optional(),
  priority: priorityApi.optional(),
  /** Admin-only: allow editing a completed assignment or regressing status */
  adminOverrideCompleted: Joi.boolean().optional(),
})
  .min(1)
  .unknown(false)
  .messages({
    'object.min': 'At least one field must be provided for update',
    'object.unknown': 'Unknown field {#label} is not allowed',
  });

const uuid = Joi.string().uuid({ version: 'uuidv4' });

export const assignmentIdParamSchema = Joi.object({
  id: uuid.required().messages({ 'string.guid': 'Invalid assignment id' }),
});

const sortBy = Joi.string().valid('deadline', 'created_at', 'priority', 'title').default('deadline');
const sortOrder = Joi.string().valid('asc', 'desc').default('asc');

export const assignmentListQuerySchema = Joi.object({
  status: Joi.string()
    .lowercase()
    .valid('pending', 'in_progress', 'completed')
    .optional(),
  priority: priorityApi.optional(),
  deadlineAfter: Joi.date().optional(),
  deadlineBefore: Joi.date().optional(),
  sortBy,
  sortOrder,
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
}).unknown(false);

export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const details = error.details.map((d) => d.message.replace(/"/g, ''));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }
    req.body = value;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const details = error.details.map((d) => d.message.replace(/"/g, ''));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }
    req.validatedQuery = value;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: false });
    if (error) {
      const details = error.details.map((d) => d.message.replace(/"/g, ''));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }
    req.validatedParams = value;
    next();
  };
}
