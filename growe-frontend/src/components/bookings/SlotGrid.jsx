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
        const slotsForBlock = availByKey.get(k) || [];
        const availableSlots = slotsForBlock.filter(s => !s.isBooked);
        const uniqueTutors = new Set(availableSlots.map(s => s.tutorId || s.tutorEmail || 'tutor')).size;
        const isPending = slotsForBlock.some(s => s.isPending);
        return { key: k, start, end, tutorCount: uniqueTutors, isPending };
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return { blocks: blocksArr, availabilityByBlock: availByKey };
  }, [slots]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {blocks.map((b) => {
        const available = b.tutorCount > 0;
        const isActuallySelected = b.key === selectedKey;
        const state = isActuallySelected || b.isPending ? 'selected' : available ? 'available' : 'booked';
        
        let sublabel = available ? `${b.tutorCount} tutor${b.tutorCount === 1 ? '' : 's'} available` : 'Booked';
        if (b.isPending) sublabel = 'Requested';

        return (
          <SlotCard
            key={b.key}
            state={state}
            label={formatTimeRange(b.start, b.end)}
            sublabel={sublabel}
            onClick={() => available && onSelectKey?.(b.key)}
          />
        );
      })}
    </div>
  );
}

