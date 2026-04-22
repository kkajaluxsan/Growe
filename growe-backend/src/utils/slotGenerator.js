/**
 * Generate bookable slots from an availability window on a 30-minute grid.
 *
 * Slots are placed at every 30-minute boundary within the window where the
 * full session duration fits.  If the window start doesn't fall on a grid
 * point, an extra slot starting at the exact window start is also included.
 *
 * @param {Object} params
 * @param {string} params.dateStr - Date in YYYY-MM-DD format
 * @param {string} params.startTime - Start time (HH:MM or HH:MM:SS)
 * @param {string} params.endTime - End time (HH:MM or HH:MM:SS)
 * @param {number} params.sessionDuration - Duration in minutes
 * @returns {Array<{start: string, end: string}>} Array of slot objects with ISO datetime strings
 */
export const generateSlots = ({ dateStr, startTime, endTime, sessionDuration }) => {
  const GRID_INTERVAL = 30 * 60; // 30 minutes in seconds

  const parseTime = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
  };

  const windowStartSec = parseTime(startTime);
  const windowEndSec = parseTime(endTime);
  const durationSec = sessionDuration * 60;

  if (durationSec <= 0 || windowEndSec <= windowStartSec) return [];

  // Collect all candidate start points: exact window start + every 30-min grid point
  const startPoints = new Set();
  startPoints.add(windowStartSec);

  const firstGrid = Math.ceil(windowStartSec / GRID_INTERVAL) * GRID_INTERVAL;
  for (let g = firstGrid; g + durationSec <= windowEndSec; g += GRID_INTERVAL) {
    startPoints.add(g);
  }
  // Also include the window start itself if it fits
  if (windowStartSec + durationSec <= windowEndSec) {
    startPoints.add(windowStartSec);
  }

  const sorted = [...startPoints].filter(s => s + durationSec <= windowEndSec).sort((a, b) => a - b);

  const pad = (n) => String(n).padStart(2, '0');
  const slots = sorted.map((s) => {
    const sH = Math.floor(s / 3600);
    const sM = Math.floor((s % 3600) / 60);
    const e = s + durationSec;
    const eH = Math.floor(e / 3600);
    const eM = Math.floor((e % 3600) / 60);

    const start = new Date(`${dateStr}T${pad(sH)}:${pad(sM)}:00`);
    const end = new Date(`${dateStr}T${pad(eH)}:${pad(eM)}:00`);

    return { start: start.toISOString(), end: end.toISOString() };
  });

  return slots;
};
