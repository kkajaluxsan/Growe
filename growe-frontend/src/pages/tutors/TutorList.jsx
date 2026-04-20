import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { localDateInputMin } from '../../utils/dateInput';
import SlotGrid from '../../components/bookings/SlotGrid';
import BookingConfirmationModal from '../../components/bookings/BookingConfirmationModal';
import BookingRejectedModal from '../../components/bookings/BookingRejectedModal';
import RatingModal from '../../components/bookings/RatingModal';

function getTodayPlus(days = 1) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateInputMin(d);
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
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { socket } = useSocket();

  const [selectedDate, setSelectedDate] = useState(() => getTodayPlus(1));
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  const [selectedKey, setSelectedKey] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [rejectedModal, setRejectedModal] = useState({ open: false, booking: null });
  const [ratingModal, setRatingModal] = useState({ open: false, booking: null });
  const bookingStatusRef = useRef(new Map());
  const bookingsBootstrappedRef = useRef(false);

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

  const fetchBookings = useCallback((isSilent = false) => {
    if (!isSilent) setBookingsLoading(true);
    api.get('/bookings', { params: { limit: 20, offset: 0 } })
      .then(({ data }) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => setBookings([]))
      .finally(() => {
        if (!isSilent) setBookingsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const promptRatingBookingId = location.state?.promptRatingBookingId;
    if (!promptRatingBookingId) return;

    api.get(`/bookings/${promptRatingBookingId}`, { skipGlobalErrorToast: true })
      .then(({ data }) => {
        if (data?.status === 'completed' && !data?.is_rated) {
          setRatingModal({ open: true, booking: data });
          toast.success('Session completed. Please rate your tutor.');
        }
      })
      .finally(() => {
        navigate(location.pathname, { replace: true, state: {} });
      });
  }, [location.pathname, location.state, navigate, toast]);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      // If a booking-related notification arrives, refresh the list immediately.
      if (notif.type === 'booking') {
        fetchBookings(true);
      }
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, fetchBookings]);

  // Polling fallback (kept as safety, but increased interval)
  useEffect(() => {
    const id = setInterval(() => {
      fetchBookings(true);
    }, 45000);
    return () => clearInterval(id);
  }, [fetchBookings]);

  // Notify + guide the student when a booking gets confirmed/rejected.
  useEffect(() => {
    const list = Array.isArray(bookings) ? bookings : [];
    const prevMap = bookingStatusRef.current;

    // First load seeds state only; no historical toasts/modals.
    if (!bookingsBootstrappedRef.current) {
      const seeded = new Map();
      list.forEach((b) => {
        if (b?.id) seeded.set(b.id, b.status || '');
      });
      bookingStatusRef.current = seeded;
      bookingsBootstrappedRef.current = true;
      return;
    }

    const nextMap = new Map();
    const newlyConfirmed = [];
    const newlyRejected = [];
    const newlyCompletedUnrated = [];

    list.forEach((b) => {
      if (!b?.id) return;
      const id = b.id;
      const status = b.status || '';
      const previous = prevMap.get(id);

      // Trigger only on transitions to avoid stale/historical noise.
      if (previous !== undefined && previous !== status) {
        if (status === 'confirmed') newlyConfirmed.push(b);
        if (status === 'rejected') newlyRejected.push(b);
        if (status === 'completed' && !b.is_rated) newlyCompletedUnrated.push(b);
      }

      nextMap.set(id, status);
    });

    bookingStatusRef.current = nextMap;

    newlyConfirmed.forEach(() => {
      toast.success('Your tutoring session has been confirmed.');
    });

    if (newlyRejected.length > 0) {
      setRejectedModal({ open: true, booking: newlyRejected[0] });
    }

    if (newlyCompletedUnrated.length > 0) {
      setRatingModal({ open: true, booking: newlyCompletedUnrated[0] });
      toast.success('Session completed. Please rate your tutor.');
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
        ['pending', 'waiting_tutor_confirmation', 'confirmed', 'rejected', 'cancelled', 'completed'].includes(b.status)
      ),
    [bookings]
  );

  const isSessionLive = useCallback((b) => {
    const now = Date.now();
    const start = new Date(b.start_time).getTime();
    const end = new Date(b.end_time).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return now >= start && now <= end;
  }, []);

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

  const openSessionChat = async (booking) => {
    const otherUserId = booking?.tutor_user_id;
    if (!otherUserId) {
      toast.error('Tutor info missing for this booking.');
      return;
    }
    try {
      const { data } = await api.post(`/conversations/direct/${otherUserId}`);
      navigate('/messages', {
        state: {
          conversation: data,
          callSession: {
            conversationId: data.id,
            bookingId: booking.id,
            callerRole: 'student',
          },
        },
      });
      toast.success('Session chat opened. Use voice/video buttons to join the session.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not open session chat');
    }
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
                min={localDateInputMin()}
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
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
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
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
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
                  {b.status === 'confirmed' && isSessionLive(b) && (
                    <Button size="sm" variant="secondary" onClick={() => openSessionChat(b)}>
                      Join Session
                    </Button>
                  )}
                  {b.status === 'rejected' && (
                    <Button size="sm" onClick={() => openRejected(b)}>
                      Choose next step
                    </Button>
                  )}
                  {b.status === 'completed' && !b.is_rated && (
                    <Button size="sm" onClick={() => setRatingModal({ open: true, booking: b })}>
                      ⭐ Rate Tutor
                    </Button>
                  )}
                  {b.status === 'completed' && b.is_rated && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Rated</span>
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

      <RatingModal
        open={ratingModal.open}
        onClose={() => setRatingModal({ open: false, booking: null })}
        booking={ratingModal.booking}
        onSubmitted={() => {
          toast.success('Rating submitted! Thank you.');
          fetchBookings(true);
        }}
      />
    </div>
  );
}
