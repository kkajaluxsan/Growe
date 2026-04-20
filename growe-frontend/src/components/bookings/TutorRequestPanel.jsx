import React, { useMemo, useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';

function formatRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = s.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = `${s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  return `${dateStr} · ${timeStr}`;
}

export default function TutorRequestPanel({ bookings, onAccept, onDecline, busyId }) {
  const pending = useMemo(
    () =>
      (Array.isArray(bookings) ? bookings : []).filter((b) =>
        ['pending', 'waiting_tutor_confirmation'].includes(b.status)
      ),
    [bookings]
  );

  if (pending.length === 0) {
    return (
      <Card className="p-6">
        <CardHeader title="Pending Booking Requests" subtitle="Requests waiting for your confirmation." />
        <p className="text-sm text-slate-600 dark:text-slate-400">No pending requests right now.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader title="Pending Booking Requests" subtitle="Requests waiting for your confirmation." />
      <div className="space-y-3">
        {pending.map((b) => (
          <div
            key={b.id}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40"
          >
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {b.student_display_name || 'Student'}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Requested Time Slot: {formatRange(b.start_time, b.end_time)}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="danger"
                onClick={() => onDecline?.(b)}
                disabled={busyId === b.id}
              >
                Decline
              </Button>
              <Button variant="success" onClick={() => onAccept?.(b)} disabled={busyId === b.id} loading={busyId === b.id}>
                Accept
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

