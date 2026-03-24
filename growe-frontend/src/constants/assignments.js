/** API expects uppercase labels (Joi schemas). */

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
