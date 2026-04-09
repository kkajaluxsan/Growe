import { useMemo, useState } from 'react';

function startOfWeekMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKey(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
}

const STATUS_RING = {
  confirmed: 'border-l-emerald-500',
  pending: 'border-l-amber-500',
  waiting_tutor_confirmation: 'border-l-amber-500',
  completed: 'border-l-slate-400',
  no_show: 'border-l-rose-400',
};

export default function TutorBookingCalendar({ bookings }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const calendarBookings = useMemo(
    () => (bookings || []).filter((b) => b.status !== 'cancelled'),
    [bookings]
  );

  const byDay = useMemo(() => {
    const m = new Map();
    days.forEach((day) => m.set(dayKey(day), []));
    calendarBookings.forEach((b) => {
      const st = new Date(b.start_time);
      const et = new Date(b.end_time);
      const key = dayKey(st);
      if (!m.has(key)) return;
      m.get(key).push({ ...b, st, et });
    });
    m.forEach((list) => list.sort((a, b) => a.st - b.st));
    return m;
  }, [calendarBookings, days]);

  const weekEnd = addDays(weekStart, 6);
  const rangeLabel =
    weekStart.getFullYear() === weekEnd.getFullYear()
      ? `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
      : `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Schedule</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(() => startOfWeekMonday(new Date()))}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{rangeLabel}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const list = byDay.get(key) || [];
          const isToday = dayKey(new Date()) === key;
          return (
            <div
              key={key}
              className={`min-h-[120px] rounded-lg border p-2 dark:border-slate-700 ${
                isToday ? 'border-emerald-400 bg-emerald-50/80 dark:border-emerald-600 dark:bg-emerald-950/30' : 'border-slate-200 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </div>
              <div className="text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
                {day.getDate()}
              </div>
              <ul className="mt-2 space-y-2">
                {list.length === 0 ? (
                  <li className="text-center text-xs text-slate-400 dark:text-slate-500">—</li>
                ) : (
                  list.map((b) => (
                    <li
                      key={b.id}
                      className={`rounded border border-slate-200 border-l-4 bg-white px-2 py-1.5 text-xs shadow-sm dark:border-slate-600 dark:bg-slate-900 ${
                        STATUS_RING[b.status] || 'border-l-slate-400'
                      }`}
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {b.st.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} –{' '}
                        {b.et.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div className="truncate text-slate-600 dark:text-slate-400">{b.student_email}</div>
                      <div className="capitalize text-slate-500 dark:text-slate-500">{b.status.replace(/_/g, ' ')}</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
