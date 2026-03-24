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
