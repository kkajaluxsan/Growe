/** API expects uppercase labels (Joi schemas). Matches growe-backend assignment.schema.js */

export const ASSIGNMENT_TITLE_MAX = 255;
export const ASSIGNMENT_DESCRIPTION_MAX = 10000;

export const ASSIGNMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

export const ASSIGNMENT_STATUSES_FILTER = [
  { value: '', label: 'All statuses' },
  ...ASSIGNMENT_STATUSES,
];

export const ASSIGNMENT_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export const ASSIGNMENT_PRIORITIES_FILTER = [
  { value: '', label: 'All priorities' },
  ...ASSIGNMENT_PRIORITIES,
];

export const SORT_OPTIONS = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'created_at', label: 'Created' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
];

export function dbStatusToApiValue(status) {
  const map = { pending: 'PENDING', in_progress: 'IN_PROGRESS', completed: 'COMPLETED' };
  return map[status] || 'PENDING';
}

export function priorityToApiValue(priority, priorityLabel) {
  if (priorityLabel && ['LOW', 'MEDIUM', 'HIGH'].includes(priorityLabel)) {
    return priorityLabel;
  }
  const map = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' };
  return map[Number(priority)] || 'MEDIUM';
}

/** `datetime-local` min = current local time, rounded to minute */
export function minDatetimeLocalNow() {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isDeadlineInFuture(deadlineLocalString) {
  if (!deadlineLocalString) return false;
  const t = new Date(deadlineLocalString).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

/** For edits: keep an existing past deadline, or require a new future deadline when changed. */
export function isDeadlineValidOnUpdate(deadlineLocalString, initialDeadlineLocal) {
  if (!deadlineLocalString) return false;
  if (deadlineLocalString === initialDeadlineLocal) return true;
  return isDeadlineInFuture(deadlineLocalString);
}

/** Client-side validation aligned with Joi (create). */
export function getCreateAssignmentErrors({ title, description, deadline }) {
  const e = {};
  const t = typeof title === 'string' ? title.trim() : '';
  const d = typeof description === 'string' ? description.trim() : '';
  if (!t) e.title = 'Title is required';
  else if (t.length > ASSIGNMENT_TITLE_MAX) e.title = `Title must be at most ${ASSIGNMENT_TITLE_MAX} characters`;
  if (!d) e.description = 'Description is required';
  else if (d.length > ASSIGNMENT_DESCRIPTION_MAX) {
    e.description = `Description must be at most ${ASSIGNMENT_DESCRIPTION_MAX} characters`;
  }
  if (!deadline) e.deadline = 'Deadline is required';
  else if (!isDeadlineInFuture(deadline)) e.deadline = 'Deadline must be after the current date and time';
  return e;
}

/** Client-side validation aligned with Joi (update). */
export function getEditAssignmentErrors({ title, description, deadline, initialDeadlineLocal }) {
  const e = {};
  const t = typeof title === 'string' ? title.trim() : '';
  const d = typeof description === 'string' ? description.trim() : '';
  if (!t) e.title = 'Title is required';
  else if (t.length > ASSIGNMENT_TITLE_MAX) e.title = `Title must be at most ${ASSIGNMENT_TITLE_MAX} characters`;
  if (!d) e.description = 'Description is required';
  else if (d.length > ASSIGNMENT_DESCRIPTION_MAX) {
    e.description = `Description must be at most ${ASSIGNMENT_DESCRIPTION_MAX} characters`;
  }
  if (!deadline) e.deadline = 'Deadline is required';
  else if (!isDeadlineValidOnUpdate(deadline, initialDeadlineLocal)) {
    e.deadline = 'When changing the deadline, pick a future date and time';
  }
  return e;
}

export function formatAssignmentStatusLabel(status) {
  if (!status || typeof status !== 'string') return '';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function listFilterDateRangeInvalid(deadlineAfter, deadlineBefore) {
  if (!deadlineAfter || !deadlineBefore) return false;
  return deadlineAfter > deadlineBefore;
}

export function formatAssignmentApiError(err) {
  const d = err.response?.data?.details;
  if (Array.isArray(d) && d.length) return d.join(' ');
  return err.response?.data?.error || err.message || 'Something went wrong';
}

export function normalizeListResponse(data) {
  if (data && Array.isArray(data.assignments)) {
    return {
      assignments: data.assignments,
      total: typeof data.total === 'number' ? data.total : data.assignments.length,
      limit: data.limit ?? data.assignments.length,
      offset: data.offset ?? 0,
    };
  }
  if (Array.isArray(data)) {
    return { assignments: data, total: data.length, limit: data.length, offset: 0 };
  }
  return { assignments: [], total: 0, limit: 20, offset: 0 };
}
