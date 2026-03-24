/**
 * Generate bookable slots from an availability window.
 * @param {Object} params
 * @param {string} params.dateStr - Date in YYYY-MM-DD format
 * @param {string} params.startTime - Start time (HH:MM or HH:MM:SS)
 * @param {string} params.endTime - End time (HH:MM or HH:MM:SS)
 * @param {number} params.sessionDuration - Duration in minutes
 * @returns {Array<{start: string, end: string}>} Array of slot objects with ISO datetime strings
 */
export const generateSlots = ({ dateStr, startTime, endTime, sessionDuration }) => {
  const slots = [];
  const date = new Date(`${dateStr}T00:00:00`);

  const parseTime = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  let currentSeconds = parseTime(startTime);
  const endSeconds = parseTime(endTime);
  const durationSeconds = sessionDuration * 60;

  while (currentSeconds + durationSeconds <= endSeconds) {
    const slotStartHours = Math.floor(currentSeconds / 3600);
    const slotStartMinutes = Math.floor((currentSeconds % 3600) / 60);
    const slotEndSeconds = currentSeconds + durationSeconds;
    const slotEndHours = Math.floor(slotEndSeconds / 3600);
    const slotEndMinutes = Math.floor((slotEndSeconds % 3600) / 60);

    const pad = (n) => String(n).padStart(2, '0');
    const startTimeStr = `${pad(slotStartHours)}:${pad(slotStartMinutes)}:00`;
    const endTimeStr = `${pad(slotEndHours)}:${pad(slotEndMinutes)}:00`;

    const start = new Date(`${dateStr}T${startTimeStr}`);
    const end = new Date(`${dateStr}T${endTimeStr}`);

    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
    });

    currentSeconds += durationSeconds;
  }

  return slots;
};
