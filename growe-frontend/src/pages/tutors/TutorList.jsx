import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

function getDateRange(days = 14) {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + days);
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

export default function TutorList() {
  const { toast } = useToast();
  const [tutors, setTutors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => getDateRange(14));

  useEffect(() => {
    api.get('/tutors/list')
      .then(({ data }) => setTutors(data))
      .catch(() => toast.error('Failed to load tutors'))
      .finally(() => setLoading(false));
  }, [toast]);

  const fetchSlots = useCallback(() => {
    setSlotsLoading(true);
    api.get('/tutors/slots', { params: dateRange })
      .then(({ data }) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => {
        setSlots([]);
        toast.error('Failed to load available slots');
      })
      .finally(() => setSlotsLoading(false));
  }, [dateRange, toast]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800" />;

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bookings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Find tutors and reserve a session.</p>
      </div>
      <div className="flex flex-col gap-4">
        {tutors.map((t) => (
          <Card key={t.id} className="w-full">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 break-words">{t.email}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.bio || 'No bio'}</p>
            {t.subjects?.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Subjects: {t.subjects.join(', ')}</p>
            )}
          </Card>
        ))}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Available slots</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) => setDateRange((r) => ({ ...r, fromDate: e.target.value }))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(e) => setDateRange((r) => ({ ...r, toDate: e.target.value }))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <Button size="sm" variant="secondary" onClick={fetchSlots} disabled={slotsLoading}>
              {slotsLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
        {slotsLoading ? (
          <div className="text-slate-500 dark:text-slate-400">Loading slots...</div>
        ) : slots.length === 0 ? (
          <Card className="py-8 text-center text-slate-600 dark:text-slate-400">
            No available slots in this range. Tutors can add availability from their dashboard; try a different date range.
          </Card>
        ) : (
          <SlotsByTutor slots={slots} onBooked={fetchSlots} toast={toast} />
        )}
      </div>
    </div>
  );
}

function formatSlotTime(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = s.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = `${s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  return { dateStr, timeStr };
}

function SlotsByTutor({ slots, onBooked, toast }) {
  const byTutor = slots.slice(0, 50).reduce((acc, s) => {
    const key = s.tutorEmail || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(byTutor).map(([email, tutorSlots]) => (
        <Card key={email} className="overflow-hidden">
          <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm" title={email}>
              {email}
            </h3>
          </div>
          <div className="pt-3 flex flex-col gap-2">
            {tutorSlots.map((s, i) => (
              <SlotChip key={`${s.availabilityId}-${s.start}-${i}`} slot={s} onBooked={onBooked} toast={toast} />
            ))}
          </div>
        </Card>
      ))}
      {slots.length > 50 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Showing first 50 slots. Use date range to see more.</p>
      )}
    </div>
  );
}

function SlotChip({ slot, onBooked, toast }) {
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const { dateStr, timeStr } = formatSlotTime(slot.start, slot.end);

  const handleBook = () => {
    setError('');
    setBooking(true);
    api.post('/bookings', {
      availabilityId: slot.availabilityId,
      startTime: slot.start,
      endTime: slot.end,
    })
      .then(() => {
        toast.success('Booking requested. Tutor will confirm.');
        onBooked?.();
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'Failed to book';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setBooking(false));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 w-full transition-all duration-200 hover:border-growe/40 hover:shadow-sm">
      <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
        {dateStr} · {timeStr}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {error && <span className="text-red-600 dark:text-red-400 text-xs max-w-[10rem]">{error}</span>}
        <Button size="sm" onClick={handleBook} disabled={booking} loading={booking}>
          Book slot
        </Button>
      </div>
    </div>
  );
}
