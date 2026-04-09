/**
 * Check if two time ranges overlap.
 * Overlap formula: NewStart < ExistingEnd AND NewEnd > ExistingStart
 * @param {Date|string} newStart - Start of new range
 * @param {Date|string} newEnd - End of new range
 * @param {Date|string} existingStart - Start of existing range
 * @param {Date|string} existingEnd - End of existing range
 * @returns {boolean}
 */
export const doTimesOverlap = (newStart, newEnd, existingStart, existingEnd) => {
  const ns = new Date(newStart).getTime();
  const ne = new Date(newEnd).getTime();
  const es = new Date(existingStart).getTime();
  const ee = new Date(existingEnd).getTime();
  return ns < ee && ne > es;
};

/**
 * Check if a datetime is in the past.
 * @param {Date|string} dateTime
 * @returns {boolean}
 */
export const isPast = (dateTime) => {
  return new Date(dateTime).getTime() < Date.now();
};

/**
 * Combine date and time into a single ISO string.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:MM or HH:MM:SS
 * @returns {string} ISO datetime string
 */
export const combineDateAndTime = (dateStr, timeStr) => {
  return `${dateStr}T${timeStr}`;
};

/**
 * Parse YYYY-MM-DD as a local calendar date (avoids UTC midnight shifting the day).
 * @param {string} ymd
 * @returns {Date|null} date at local 00:00:00 or null if invalid
 */
export const parseYYYYMMDDLocal = (ymd) => {
  if (!ymd || typeof ymd !== 'string') return null;
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
};

/** Today at local 00:00:00. */
export const startOfLocalDay = (ref = new Date()) => {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
};

/**
 * Local wall-clock instant for a calendar date + time (HH:MM or HH:MM:SS).
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr
 * @returns {Date|null}
 */
export const combineDateAndTimeLocal = (dateStr, timeStr) => {
  const day = parseYYYYMMDDLocal(dateStr);
  if (!day) return null;
  let ts = typeof timeStr === 'string' ? timeStr.trim() : '';
  if (!ts) return null;
  if (/^\d{2}:\d{2}$/.test(ts)) ts += ':00';
  const parts = ts.split(':').map((x) => parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  const hh = parts[0] ?? 0;
  const mm = parts[1] ?? 0;
  const ss = parts[2] ?? 0;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm, ss, 0);
};
