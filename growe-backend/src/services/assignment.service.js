import * as assignmentModel from '../models/assignment.model.js';
import * as notificationService from './notification.service.js';
import { sanitizePlainText } from '../utils/textSanitize.js';
import {
  PRIORITY_TO_DB,
  DB_TO_PRIORITY_LABEL,
  STATUS_TO_DB,
} from '../validation/assignment.schema.js';

function httpError(statusCode, message, details) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (details) err.details = details;
  return err;
}

export function enrichAssignment(row) {
  if (!row) return row;
  const deadline = row.deadline ? new Date(row.deadline) : null;
  const now = Date.now();
  const isOverdue =
    Boolean(deadline && !Number.isNaN(deadline.getTime())) &&
    deadline.getTime() < now &&
    row.status !== 'completed';
  return {
    ...row,
    priorityLabel: DB_TO_PRIORITY_LABEL[row.priority] ?? 'MEDIUM',
    isOverdue,
  };
}

function normalizeStatusFromApi(value) {
  if (value === undefined || value === null) return undefined;
  const key = String(value).toUpperCase();
  return STATUS_TO_DB[key];
}

function normalizePriorityFromApi(value) {
  if (value === undefined || value === null) return undefined;
  const key = String(value).toUpperCase();
  return PRIORITY_TO_DB[key];
}

function toDateOrNull(iso) {
  if (iso === undefined || iso === null) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Allowed status moves for non-admin users (completed is a terminal state unless admin overrides).
 */
function assertStatusTransition(prevDb, nextDb, { isAdmin, adminOverrideCompleted }) {
  if (prevDb === nextDb) return;
  if (prevDb === 'completed') {
    if (!isAdmin || !adminOverrideCompleted) {
      throw httpError(
        403,
        'Cannot change status of a completed assignment without admin override',
        [
          'Completed assignments stay completed unless an admin sends adminOverrideCompleted: true and a new status.',
        ]
      );
    }
    return;
  }
  const allowed = {
    pending: ['in_progress', 'completed', 'pending'],
    in_progress: ['pending', 'in_progress', 'completed'],
    completed: ['completed'],
  };
  const set = allowed[prevDb];
  if (!set || !set.includes(nextDb)) {
    throw httpError(400, 'Invalid status transition', [
      `Cannot move from ${prevDb} to ${nextDb}. Allowed: ${(set || []).join(', ')}`,
    ]);
  }
}

export async function createAssignment(userId, body) {
  const title = sanitizePlainText(body.title);
  const description = sanitizePlainText(body.description);
  const statusDb = normalizeStatusFromApi(body.status) ?? 'pending';
  const priorityDb = normalizePriorityFromApi(body.priority) ?? 2;
  const deadline = toDateOrNull(body.deadline);
  if (!deadline) {
    throw httpError(400, 'Invalid deadline', ['Deadline must be a valid future date']);
  }
  if (deadline.getTime() <= Date.now()) {
    throw httpError(400, 'Invalid deadline', ['Deadline must be after the current date and time']);
  }

  const row = await assignmentModel.create({
    userId,
    title,
    description,
    status: statusDb,
    priority: priorityDb,
    deadline,
  });
  Promise.resolve()
    .then(() => notificationService.notifyAssignmentCreated({ userId, assignment: row }))
    .catch(() => {});
  return enrichAssignment(row);
}

export async function listAssignments(userId, validatedQuery) {
  const {
    status,
    priority,
    deadlineAfter,
    deadlineBefore,
    sortBy,
    sortOrder,
    limit,
    offset,
  } = validatedQuery;

  const priorityDb = priority ? normalizePriorityFromApi(priority) : undefined;

  const rows = await assignmentModel.listByUser(userId, {
    status,
    priority: priorityDb,
    deadlineAfter: deadlineAfter ? new Date(deadlineAfter) : undefined,
    deadlineBefore: deadlineBefore ? new Date(deadlineBefore) : undefined,
    sortBy,
    sortOrder,
    limit,
    offset,
  });
  const total = await assignmentModel.countByUser(userId, {
    status,
    priority: priorityDb,
    deadlineAfter: deadlineAfter ? new Date(deadlineAfter) : undefined,
    deadlineBefore: deadlineBefore ? new Date(deadlineBefore) : undefined,
  });

  return {
    assignments: rows.map(enrichAssignment),
    total,
    limit,
    offset,
  };
}

export async function updateAssignment(userId, id, body, { roleName }) {
  const existing = await assignmentModel.findById(id);
  if (!existing) {
    throw httpError(404, 'Assignment not found');
  }

  const isAdmin = roleName === 'admin';
  if (existing.user_id !== userId && !isAdmin) {
    throw httpError(403, 'You can only update your own assignments');
  }

  const adminOverrideCompleted = Boolean(body.adminOverrideCompleted);

  const patch = { ...body };
  delete patch.adminOverrideCompleted;

  if (existing.status === 'completed') {
    if (!isAdmin || !adminOverrideCompleted) {
      throw httpError(
        403,
        'Completed assignments cannot be modified without admin override',
        [
          'Admins must send adminOverrideCompleted: true to edit fields or regress status on a completed assignment.',
        ]
      );
    }
  }

  const nextStatusDb =
    patch.status !== undefined ? normalizeStatusFromApi(patch.status) : undefined;
  if (nextStatusDb !== undefined) {
    assertStatusTransition(existing.status, nextStatusDb, { isAdmin, adminOverrideCompleted });
  }

  const updatePayload = {};
  if (patch.title !== undefined) updatePayload.title = sanitizePlainText(patch.title);
  if (patch.description !== undefined) updatePayload.description = sanitizePlainText(patch.description);
  if (patch.priority !== undefined) updatePayload.priority = normalizePriorityFromApi(patch.priority);
  if (patch.status !== undefined) updatePayload.status = nextStatusDb;
  if (patch.deadline !== undefined) {
    const d = toDateOrNull(patch.deadline);
    if (d === null) {
      throw httpError(400, 'Invalid deadline', ['Deadline must be a valid date']);
    }
    const prevMs = existing.deadline ? new Date(existing.deadline).getTime() : NaN;
    const unchanged = !Number.isNaN(prevMs) && Math.abs(d.getTime() - prevMs) < 2000;
    if (!unchanged && d.getTime() <= Date.now()) {
      throw httpError(400, 'Invalid deadline', [
        'Deadline must be after the current date and time when changing the due date',
      ]);
    }
    if (!unchanged) {
      updatePayload.deadline = d;
    }
  }

  const updated = await assignmentModel.update(id, updatePayload);
  if (!updated) {
    throw httpError(404, 'Assignment not found');
  }
  return enrichAssignment(updated);
}

export async function softDeleteAssignment(requesterUserId, id, { roleName }) {
  const existing = await assignmentModel.findById(id);
  if (!existing) {
    throw httpError(404, 'Assignment not found');
  }
  const isOwner = existing.user_id === requesterUserId;
  const isAdmin = roleName === 'admin';
  if (!isOwner && !isAdmin) {
    throw httpError(403, 'Only the assignment owner or an admin can delete this assignment');
  }
  const ok = await assignmentModel.softDeleteById(id);
  if (!ok) {
    throw httpError(404, 'Assignment not found');
  }
}

export function getEnrichedById(row) {
  return enrichAssignment(row);
}
