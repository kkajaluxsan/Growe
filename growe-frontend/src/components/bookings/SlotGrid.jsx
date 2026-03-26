import React, { useMemo } from 'react';
import SlotCard from './SlotCard';

function formatTimeRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function getKey(start, end) {
  return `${start}__${end}`;
}

export default function SlotGrid({ slots, selectedKey, onSelectKey }) {
  const { blocks, availabilityByBlock } = useMemo(() => {
    const availByKey = new Map();
    const keyToTutors = new Map();
    (Array.isArray(slots) ? slots : []).forEach((s) => {
      const k = getKey(s.start, s.end);
      if (!availByKey.has(k)) availByKey.set(k, []);
      availByKey.get(k).push(s);
      const set = keyToTutors.get(k) || new Set();
      set.add(s.tutorId || s.tutorEmail || 'tutor');
      keyToTutors.set(k, set);
    });

    const blocksArr = Array.from(availByKey.keys())
      .map((k) => {
        const [start, end] = k.split('__');
        return { key: k, start, end, tutorCount: keyToTutors.get(k)?.size || 0 };
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Make it feel like a theatre grid: include missing time blocks based on observed interval
    if (blocksArr.length >= 2) {
      const starts = blocksArr.map((b) => new Date(b.start).getTime()).sort((a, b) => a - b);
      const deltas = [];
      for (let i = 1; i < starts.length; i += 1) deltas.push(starts[i] - starts[i - 1]);
      const step = deltas.sort((a, b) => a - b)[0] || 60 * 60 * 1000;
      const min = starts[0];
      const max = starts[starts.length - 1];
      for (let t = min; t <= max; t += step) {
        const start = new Date(t).toISOString();
        const end = new Date(t + step).toISOString();
        const k = getKey(start, end);
        if (!availByKey.has(k)) {
          availByKey.set(k, []);
          blocksArr.push({ key: k, start, end, tutorCount: 0, synthetic: true });
        }
      }
      blocksArr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    return { blocks: blocksArr, availabilityByBlock: availByKey };
  }, [slots]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {blocks.map((b) => {
        const available = (availabilityByBlock.get(b.key) || []).length > 0;
        const state = b.key === selectedKey ? 'selected' : available ? 'available' : 'booked';
        return (
          <SlotCard
            key={b.key}
            state={state}
            label={formatTimeRange(b.start, b.end)}
            sublabel={available ? `${b.tutorCount} tutor${b.tutorCount === 1 ? '' : 's'} available` : 'No tutors available'}
            onClick={() => onSelectKey?.(b.key)}
          />
        );
      })}
    </div>
  );
}

