import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../../services/api';
import Button from '../ui/Button';
import { localDateInputMin } from '../../utils/dateInput';

function formatSlotLabel(startIso, endIso) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
  const d = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const t1 = s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const t2 = e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${d} · ${t1} – ${t2}`;
}

/**
 * Mandatory section UI; selecting a tutor is optional.
 * @param {object} props
 * @param {string} props.subject - optional subject filter / label for invite
 * @param {(tutor: object|null) => void} props.onTutorChange
 * @param {(slot: { start: string, end: string }|null) => void} props.onSlotChange
 */
export default function TutorSelectionSection({ subject, onTutorChange, onSlotChange }) {
  const [sessionDate, setSessionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return localDateInputMin(d);
  });
  const [daySlots, setDaySlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [tutorsLoading, setTutorsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 280);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    onSlotChange?.(selectedSlot);
  }, [selectedSlot, onSlotChange]);

  useEffect(() => {
    onTutorChange?.(selectedTutor);
  }, [selectedTutor, onTutorChange]);

  const loadDaySlots = useCallback(() => {
    if (!sessionDate) {
      setDaySlots([]);
      setSelectedSlot(null);
      return;
    }
    setSlotsLoading(true);
    api
      .get('/tutors/slots', { params: { fromDate: sessionDate, toDate: sessionDate, duration: 60 }, skipGlobalErrorToast: true })
      .then(({ data }) => {
        const raw = Array.isArray(data) ? data : [];
        const now = Date.now() - 15 * 60 * 1000;
        const seen = new Set();
        const unique = [];
        raw.forEach((s) => {
          if (new Date(s.start).getTime() < now) return;
          const key = `${s.start}|${s.end}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push({ start: s.start, end: s.end });
          }
        });
        unique.sort((a, b) => new Date(a.start) - new Date(b.start));
        setDaySlots(unique);
      })
      .catch(() => setDaySlots([]))
      .finally(() => setSlotsLoading(false));
  }, [sessionDate]);

  useEffect(() => {
    loadDaySlots();
  }, [loadDaySlots]);

  useEffect(() => {
    setSelectedTutor(null);
    setSelectedSlot(null);
  }, [sessionDate]);

  useEffect(() => {
    if (!selectedSlot?.start || !selectedSlot?.end) {
      setTutors([]);
      return;
    }
    let cancelled = false;
    setTutorsLoading(true);
    api
      .get('/tutors/available-for-slot', {
        params: {
          start: selectedSlot.start,
          end: selectedSlot.end,
          subject: subject?.trim() || undefined,
          q: searchDebounced.trim() || undefined,
        },
        skipGlobalErrorToast: true,
      })
      .then(({ data }) => {
        if (!cancelled) setTutors(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setTutors([]);
      })
      .finally(() => {
        if (!cancelled) setTutorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSlot, subject, searchDebounced]);

  const handlePickSlot = (slot) => {
    setSelectedSlot(slot);
    setSelectedTutor(null);
  };

  const displayTutors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tutors;
    return tutors.filter((t) => {
      const hay = [
        t.displayName,
        t.email,
        t.bio,
        ...(Array.isArray(t.subjects) ? t.subjects : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tutors, search]);

  const tutorOptionValue = (t) => `${t.tutorUserId}|${t.availabilityId}`;

  /** Keep current selection visible in the dropdown even if the filter would hide it. */
  const tutorOptionsInSelect = useMemo(() => {
    if (!selectedTutor) return displayTutors;
    const key = tutorOptionValue(selectedTutor);
    if (displayTutors.some((t) => tutorOptionValue(t) === key)) return displayTutors;
    return [selectedTutor, ...displayTutors];
  }, [displayTutors, selectedTutor]);

  const handleTutorSelectChange = (e) => {
    const v = e.target.value;
    if (!v) {
      setSelectedTutor(null);
      return;
    }
    const t = tutors.find((x) => tutorOptionValue(x) === v);
    setSelectedTutor(t || null);
  };

  const handleClearTutor = () => {
    setSelectedTutor(null);
  };

  return (
    <section className="rounded-xl border border-slate-200/80 dark:border-slate-600/80 bg-white dark:bg-slate-900/40 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tutor selection</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose when the group will meet, then optionally invite a tutor. Tutors shown here are free for that exact
            time (no double booking). Inviting a tutor sends a request — they join only after accepting.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="session-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Session date
            </label>
            <input
              id="session-date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              min={localDateInputMin()}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="session-slot" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Session time slot
            </label>
            <select
              id="session-slot"
              value={selectedSlot ? `${selectedSlot.start}|${selectedSlot.end}` : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  setSelectedSlot(null);
                  return;
                }
                const [start, end] = v.split('|');
                handlePickSlot({ start, end });
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100"
            >
              <option value="">{slotsLoading ? 'Loading slots…' : 'Select a time slot'}</option>
              {daySlots.map((s) => (
                <option key={`${s.start}|${s.end}`} value={`${s.start}|${s.end}`}>
                  {formatSlotLabel(s.start, s.end)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Only times that fit tutors’ published availability are listed.
            </p>
          </div>
        </div>

        {selectedSlot && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="tutor-select"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Tutor (optional)
                </label>
                <select
                  id="tutor-select"
                  disabled={tutorsLoading}
                  value={
                    selectedTutor
                      ? tutorOptionValue(selectedTutor)
                      : ''
                  }
                  onChange={handleTutorSelectChange}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 px-3 text-slate-900 dark:text-slate-100 disabled:opacity-60"
                >
                  <option value="">
                    {tutorsLoading
                      ? 'Loading available tutors…'
                      : tutorOptionsInSelect.length === 0
                        ? 'No tutors available for this time — leave as student-only group'
                        : 'No tutor — create a student-only group'}
                  </option>
                  {!tutorsLoading &&
                    tutorOptionsInSelect.map((t) => {
                      const subj = Array.isArray(t.subjects) && t.subjects.length ? t.subjects.join(', ') : 'General';
                      const sessions = typeof t.sessionsCompleted === 'number' ? t.sessionsCompleted : 0;
                      const label = `${t.displayName || t.email} — ${subj} · ${sessions} session${sessions === 1 ? '' : 's'}${t.subjectMatch ? ' · matches subject' : ''}`;
                      return (
                        <option key={tutorOptionValue(t)} value={tutorOptionValue(t)}>
                          {label}
                        </option>
                      );
                    })}
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Only tutors free for this exact slot are listed. Choosing one sends a request; they are added after they
                  accept.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="tutor-search" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Filter list (optional)
                </label>
                <input
                  id="tutor-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Narrow by name, subject, or skills…"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>

            {!tutorsLoading && tutorOptionsInSelect.length === 0 && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
                No tutors match this slot{subject?.trim() ? ' with the current subject filter' : ''}. Try another time or
                create the group without a tutor.
              </div>
            )}

            {selectedTutor && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 px-3 py-2.5 text-sm">
                <span className="text-slate-800 dark:text-slate-200">
                  Request will go to <strong>{selectedTutor.displayName || selectedTutor.email}</strong> ·{' '}
                  {formatSlotLabel(selectedSlot.start, selectedSlot.end)}
                </span>
                <Button type="button" variant="secondary" className="!py-1 !px-2 text-xs" onClick={handleClearTutor}>
                  Clear
                </Button>
              </div>
            )}
          </>
        )}

        {!selectedSlot && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pick a session time slot to load tutors. You can still create a student-only group without selecting a tutor.
          </p>
        )}
      </div>
    </section>
  );
}

export { formatSlotLabel };
