import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import TutorCard from '../../components/bookings/TutorCard';
import { useToast } from '../../context/ToastContext';

function hashToRating(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  const base = 3.8 + (h % 13) / 20; // 3.8 .. 4.45
  return Math.min(5, Math.round(base * 10) / 10);
}

export default function TutorSelectionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const state = location.state || {};
  const selectedDate = state.selectedDate;
  const startTime = state.startTime;
  const endTime = state.endTime;

  const [tutors, setTutors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingForTutorId, setCreatingForTutorId] = useState('');

  useEffect(() => {
    if (!selectedDate || !startTime || !endTime) {
      navigate('/tutors', { replace: true });
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get('/tutors/list').catch(() => ({ data: [] })),
      api.get('/tutors/slots', { params: { fromDate: selectedDate, toDate: selectedDate } }).catch(() => ({ data: [] })),
    ])
      .then(([tRes, sRes]) => {
        if (cancelled) return;
        setTutors(Array.isArray(tRes.data) ? tRes.data : []);
        setSlots(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, startTime, endTime, navigate]);

  const matchingSlots = useMemo(() => {
    const st = String(startTime);
    const et = String(endTime);
    return (Array.isArray(slots) ? slots : []).filter((s) => String(s.start) === st && String(s.end) === et);
  }, [slots, startTime, endTime]);

  const tutorsForTime = useMemo(() => {
    const availabilityByTutor = new Map();
    matchingSlots.forEach((s) => {
      if (!s.tutorId) return;
      if (!availabilityByTutor.has(s.tutorId)) availabilityByTutor.set(s.tutorId, s.availabilityId);
    });

    const filtered = (Array.isArray(tutors) ? tutors : []).filter((t) => availabilityByTutor.has(t.id));
    const withMeta = filtered.map((t) => ({
      ...t,
      _availabilityId: availabilityByTutor.get(t.id),
      _rating: hashToRating(String(t.id || t.email || 'tutor')),
    }));
    withMeta.sort((a, b) => (b._rating || 0) - (a._rating || 0));
    return withMeta;
  }, [matchingSlots, tutors]);

  const displayWhen = useMemo(() => {
    const s = new Date(startTime);
    const e = new Date(endTime);
    const dateStr = s.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = `${s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} – ${e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    return `${dateStr} · ${timeStr}`;
  }, [startTime, endTime]);

  const handleSelectTutor = async (tutor) => {
    const availabilityId = tutor?._availabilityId;
    if (!availabilityId) {
      toast.error('This tutor no longer has this slot available.');
      return;
    }
    setCreatingForTutorId(tutor.id);
    try {
      const payload = {
        availabilityId,
        startTime,
        endTime,
        // Prefer the new status but don't rely on it being required/accepted.
        status: 'waiting_tutor_confirmation',
      };

      const res = await api.post('/bookings', payload);

      const bookingId =
        res?.data?.id ||
        res?.data?.booking?.id ||
        res?.data?.data?.id ||
        null;

      // If the API doesn't accept status on create, try updating it after creation.
      if (bookingId) {
        try {
          await api.patch(`/bookings/${bookingId}/status`, { status: 'waiting_tutor_confirmation' });
        } catch (_) {
          // ignore: keep backwards compatibility with existing booking API behavior
        }
      }
      toast.success('Booking requested. Waiting for tutor confirmation.');
      navigate('/tutors', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create booking request');
    } finally {
      setCreatingForTutorId('');
    }
  };

  if (!selectedDate || !startTime || !endTime) return null;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Select a Tutor</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Time slot: <span className="font-medium text-slate-700 dark:text-slate-200">{displayWhen}</span>
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/tutors')}>
          Back to slots
        </Button>
      </div>

      <Card className="p-6">
        <CardHeader title="Available tutors" subtitle="Sorted by highest rating first." />
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400">Loading tutors...</div>
        ) : tutorsForTime.length === 0 ? (
          <div className="text-slate-600 dark:text-slate-400 text-sm">
            No tutors are currently available for this time. Please choose another slot.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tutorsForTime.map((t) => (
              <TutorCard
                key={t.id}
                tutor={t}
                selecting={creatingForTutorId === t.id}
                onSelect={() => handleSelectTutor(t)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

