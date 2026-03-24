import { describe, it } from 'node:test';
import assert from 'node:assert';
import { doTimesOverlap, isPast, combineDateAndTime } from './timeUtils.js';

describe('timeUtils', () => {
  describe('doTimesOverlap', () => {
    it('returns true when ranges overlap', () => {
      assert.strictEqual(doTimesOverlap('2025-01-01T10:00', '2025-01-01T11:00', '2025-01-01T10:30', '2025-01-01T11:30'), true);
    });
    it('returns false when ranges do not overlap', () => {
      assert.strictEqual(doTimesOverlap('2025-01-01T10:00', '2025-01-01T11:00', '2025-01-01T11:00', '2025-01-01T12:00'), false);
    });
    it('returns true when one range contains the other', () => {
      assert.strictEqual(doTimesOverlap('2025-01-01T09:00', '2025-01-01T12:00', '2025-01-01T10:00', '2025-01-01T11:00'), true);
    });
  });

  describe('isPast', () => {
    it('returns true for past date', () => {
      assert.strictEqual(isPast('2020-01-01T00:00:00'), true);
    });
    it('returns false for future date', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      assert.strictEqual(isPast(future), false);
    });
  });

  describe('combineDateAndTime', () => {
    it('combines date and time correctly', () => {
      assert.strictEqual(combineDateAndTime('2025-06-15', '14:30'), '2025-06-15T14:30');
    });
  });
});
