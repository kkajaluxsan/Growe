import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateSlots } from './slotGenerator.js';

describe('slotGenerator', () => {
  it('generates slots for 1-hour window with 30-min duration', () => {
    const slots = generateSlots({
      dateStr: '2025-06-15',
      startTime: '09:00',
      endTime: '11:00',
      sessionDuration: 30,
    });
    assert.strictEqual(slots.length, 4);
    assert.strictEqual(slots[0].start.includes('2025-06-15'), true);
    assert.strictEqual(slots[0].end.includes('2025-06-15'), true);
  });

  it('generates no slots when window is shorter than duration', () => {
    const slots = generateSlots({
      dateStr: '2025-06-15',
      startTime: '09:00',
      endTime: '09:30',
      sessionDuration: 60,
    });
    assert.strictEqual(slots.length, 0);
  });

  it('generates one slot when window equals duration', () => {
    const slots = generateSlots({
      dateStr: '2025-06-15',
      startTime: '09:00',
      endTime: '10:00',
      sessionDuration: 60,
    });
    assert.strictEqual(slots.length, 1);
  });
});
