import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import SlotGrid from '../../components/bookings/SlotGrid';
import BookingConfirmationModal from '../../components/bookings/BookingConfirmationModal';
import BookingRejectedModal from '../../components/bookings/BookingRejectedModal';

function getTodayPlus(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function keyToRange(key) {
  const [start, end] = String(key || '').split('__');
  return { start, end };
}

function formatDateHeading(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function TutorList() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(() => getTodayPlus(1));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  const [selectedKey, setSelectedKey] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [rejectedModal, setRejectedModal] = useState({ open: false, booking: null });
  const lastNotifiedRef = useRef({ confirmed: new Set(), rejected: new Set() });

  const fetchSlots = useCallback(() => {
    setSlotsLoading(true);
    setSlots([]);
    api.get('/tutors/slots', { params: { fromDate: selectedDate, toDate: selectedDate } })
      .then(({ data }) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => {
        setSlots([]);
        toast.error('Failed to load available slots');
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, toast]);

  const fetchBookings = useCallback(() => {
    setBookingsLoading(true);
    api.get('/bookings', { params: { limit: 20, offset: 0 } })
      .then(({ data }) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Lightweight polling so students see accept/decline outcomes promptly.
  useEffect(() => {
    const id = setInterval(() => {
      fetchBookings();
    }, 15000);
    return () => clearInterval(id);
  }, [fetchBookings]);

  // Notify + guide the student when a booking gets confirmed/rejected.
  useEffect(() => {
    const list = Array.isArray(bookings) ? bookings : [];

    const newlyConfirmed = list.filter(
      (b) => b?.status === 'confirmed' && b?.id && !lastNotifiedRef.current.confirmed.has(b.id)
    );
    newlyConfirmed.forEach((b) => {
      lastNotifiedRef.current.confirmed.add(b.id);
      toast.success('Your tutoring session has been confirmed.');
    });

    const newlyRejected = list.filter(
      (b) => b?.status === 'rejected' && b?.id && !lastNotifiedRef.current.rejected.has(b.id)
    );
    if (newlyRejected.length > 0) {
      const b = newlyRejected[0];
      lastNotifiedRef.current.rejected.add(b.id);
      setRejectedModal({ open: true, booking: b });
    }
  }, [bookings, toast]);

  const legend = (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-500/40 border border-emerald-500/60" /> Available</span>
      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-300 border border-slate-400 dark:bg-slate-700 dark:border-slate-600" /> Booked</span>
      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-blue-500/40 border border-blue-500/60" /> Selected</span>
    </div>
  );

  const activeBookings = useMemo(
    () =>
      (Array.isArray(bookings) ? bookings : []).filter((b) =>
        ['pending', 'waiting_tutor_confirmation', 'confirmed', 'rejected'].includes(b.status)
      ),
    [bookings]
  );

  const handleSlotClick = (key) => {
    setSelectedKey(key);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    const { start, end } = keyToRange(selectedKey);
    if (!start || !end) return;
    setConfirmOpen(false);
    navigate('/tutors/select', {
      state: {
        selectedDate,
        startTime: start,
        endTime: end,
      },
    });
  };

  const openRejected = (booking) => {
    setRejectedModal({ open: true, booking });
  };

  const handleRejectedSelectAnotherTutor = () => {
    const b = rejectedModal.booking;
    if (!b) return;
    setRejectedModal({ open: false, booking: null });
    navigate('/tutors/select', {
      state: {
        selectedDate: String(b.available_date || '').slice(0, 10) || new Date(b.start_time).toISOString().slice(0, 10),
        startTime: b.start_time,
        endTime: b.end_time,
      },
    });
  };

  const handleRejectedChooseAnotherTime = () => {
    setRejectedModal({ open: false, booking: null });
    // stay on slot grid
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bookings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Choose a time slot first, then select a tutor.
        </p>
      </div>

      <Card className="p-6">
        <CardHeader
          title="Time Slot Selection"
          subtitle="Pick a slot (theatre-style) and confirm to choose a tutor."
          action={
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <Button size="sm" variant="secondary" onClick={fetchSlots} disabled={slotsLoading}>
                {slotsLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          }
        />
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {formatDateHeading(selectedDate)}
          </div>
          {legend}
        </div>

        {slotsLoading ? (
          <div className="text-slate-500 dark:text-slate-400">Loading slots...</div>
        ) : (
          <SlotGrid slots={slots} selectedKey={selectedKey} onSelectKey={handleSlotClick} />
        )}
        {!slotsLoading && slots.length === 0 && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            No tutors available on this date. Try another day.
          </div>
        )}
      </Card>

      <Card className="p-6">
        <CardHeader
          title="Your bookings"
          subtitle="Track tutor confirmations and outcomes."
          action={
            <Button size="sm" variant="secondary" onClick={fetchBookings} disabled={bookingsLoading}>
              {bookingsLoading ? 'Loading...' : 'Refresh'}
            </Button>
          }
        />
        {bookingsLoading ? (
          <div className="text-slate-500 dark:text-slate-400">Loading your bookings...</div>
        ) : activeBookings.length === 0 ? (
          <div className="text-sm text-slate-600 dark:text-slate-400">No active bookings yet.</div>
        ) : (
          <div className="space-y-2">
            {activeBookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    Tutor: {b.tutor_email || '—'}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {new Date(b.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
                    {b.status === 'waiting_tutor_confirmation' ? 'waiting_tutor_confirmation' : b.status}
                  </span>
                  {b.status === 'rejected' && (
                    <Button size="sm" onClick={() => openRejected(b)}>
                      Choose next step
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <BookingConfirmationModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />

      <BookingRejectedModal
        open={rejectedModal.open}
        onClose={() => setRejectedModal({ open: false, booking: null })}
        onSelectAnotherTutor={handleRejectedSelectAnotherTutor}
        onChooseAnotherTime={handleRejectedChooseAnotherTime}
      />
    </div>
  );
}
