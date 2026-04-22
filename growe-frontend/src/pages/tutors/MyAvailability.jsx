import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../context/ToastContext';
import { localDateInputMin } from '../../utils/dateInput';

export default function MyAvailability() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupInvites, setGroupInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [actingInviteId, setActingInviteId] = useState(null);

  const [availableDate, setAvailableDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [durationMode, setDurationMode] = useState('preset');
  const [presetDuration, setPresetDuration] = useState(60);
  const [maxStudentsPerSlot, setMaxStudentsPerSlot] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({
    availableDate: '',
    startTime: '09:00',
    endTime: '17:00',
    durationMode: 'preset',
    presetDuration: 60,
    sessionDuration: 60,
    maxStudentsPerSlot: 1,
  });

  const todayStr = localDateInputMin();
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Expose state setters for E2E testing
  if (import.meta.env.VITE_TEST_MODE === 'true' || import.meta.env.DEV) {
    window._setAvailableDate = setAvailableDate;
    window._setStartTime = setStartTime;
    window._setEndTime = setEndTime;
  }

  const isToday = availableDate === todayStr;

  // Compute window duration in minutes for validation
  const effectiveDuration = durationMode === 'custom' ? sessionDuration : presetDuration;
  const windowMinutes = (() => {
    if (!startTime || !endTime) return 0;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    return (eH * 60 + eM) - (sH * 60 + sM);
  })();
  const durationExceedsWindow = effectiveDuration > windowMinutes && windowMinutes > 0;

  // Estimate how many bookable slots this creates (30-min grid)
  const estimatedSlots = (() => {
    if (!startTime || !endTime || windowMinutes <= 0 || effectiveDuration <= 0 || effectiveDuration > windowMinutes) return 0;
    const GRID = 30;
    const [sH, sM] = startTime.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = startMin + windowMinutes;
    const firstGrid = Math.ceil(startMin / GRID) * GRID;
    const starts = new Set();
    if (startMin + effectiveDuration <= endMin) starts.add(startMin);
    for (let g = firstGrid; g + effectiveDuration <= endMin; g += GRID) starts.add(g);
    return starts.size;
  })();

  const isAddInvalid = !availableDate || !startTime || !endTime || startTime >= endTime || (isToday && startTime < currentTimeStr) || durationExceedsWindow;

  const load = () => {
    setLoading(true);
    api.get('/tutors/availability')
      .then(({ data }) => setAvailability(Array.isArray(data) ? data : []))
      .catch(() => {
        setAvailability([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const loadGroupInvites = () => {
    setInvitesLoading(true);
    api
      .get('/tutors/group-invites', { skipGlobalErrorToast: true })
      .then(({ data }) => setGroupInvites(Array.isArray(data) ? data : []))
      .catch(() => setGroupInvites([]))
      .finally(() => setInvitesLoading(false));
  };

  useEffect(() => {
    loadGroupInvites();
  }, []);

  const handleAcceptGroupInvite = (inv) => {
    setActingInviteId(inv.id);
    api
      .post(`/groups/${inv.group_id}/tutor-invites/${inv.id}/accept`)
      .then(() => {
        toast.success('Session accepted. View it on Tutors → Calendar or My Bookings. Join the video when the time comes.');
        loadGroupInvites();
        navigate('/tutors?tab=schedule', { replace: true });
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not accept'))
      .finally(() => setActingInviteId(null));
  };

  const handleRejectGroupInvite = (inv) => {
    setActingInviteId(inv.id);
    api
      .post(`/groups/${inv.group_id}/tutor-invites/${inv.id}/reject`)
      .then(() => {
        toast.success('Request declined');
        loadGroupInvites();
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not decline'))
      .finally(() => setActingInviteId(null));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (isAddInvalid) return;
    setError('');
    setSaving(true);
    try {
      await api.post('/tutors/availability', {
        availableDate,
        startTime: startTime + ':00',
        endTime: endTime + ':00',
        sessionDuration: durationMode === 'custom' ? sessionDuration : presetDuration,
        maxStudentsPerSlot,
      });
      setAvailableDate('');
      toast.success('Availability added');
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (slot) => {
    const currentDuration = Number(slot.session_duration) || 60;
    const preset = [30, 45, 60, 90].includes(currentDuration) ? currentDuration : 60;
    const mode = [30, 45, 60, 90].includes(currentDuration) ? 'preset' : 'custom';
    setEditingId(String(slot.id));
    setEditForm({
      availableDate: slot.available_date,
      startTime: slot.start_time?.slice(0, 5) || '09:00',
      endTime: slot.end_time?.slice(0, 5) || '17:00',
      durationMode: mode,
      presetDuration: preset,
      sessionDuration: currentDuration,
      maxStudentsPerSlot: Number(slot.max_students_per_slot) || 1,
    });
  };

  const cancelEdit = () => {
    setEditingId('');
  };

  const saveEdit = async (id) => {
    try {
      await api.patch(`/tutors/availability/${id}`, {
        availableDate: editForm.availableDate,
        startTime: `${editForm.startTime}:00`,
        endTime: `${editForm.endTime}:00`,
        sessionDuration:
          editForm.durationMode === 'custom'
            ? Number(editForm.sessionDuration)
            : Number(editForm.presetDuration),
        maxStudentsPerSlot: Number(editForm.maxStudentsPerSlot) || 1,
      });
      toast.success('Availability updated');
      setEditingId('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.details?.[0] || 'Failed to update availability');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this availability slot?')) return;
    try {
      await api.delete(`/tutors/availability/${id}`);
      toast.success('Availability removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Availability"
        subtitle="Set tutoring windows for students to discover and book verified learning sessions."
      />

      <Card className="max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">Study group tutor requests</h2>
          <Button size="sm" variant="secondary" onClick={loadGroupInvites} disabled={invitesLoading}>
            Refresh
          </Button>
        </div>
        {invitesLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : groupInvites.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No pending group tutor requests.</p>
        ) : (
          <ul className="space-y-3">
            {groupInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/50"
              >
                <div className="text-sm min-w-0">
                  <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {inv.group_name || 'Study group'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1">
                    From {inv.requester_display_name || inv.requester_email}
                    {inv.slot_start
                      ? ` · ${new Date(inv.slot_start).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}`
                      : ''}
                  </div>
                  {inv.subject ? (
                    <div className="text-xs text-slate-500 mt-1">Subject: {inv.subject}</div>
                  ) : null}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleAcceptGroupInvite(inv)}
                    disabled={actingInviteId === inv.id}
                    loading={actingInviteId === inv.id}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRejectGroupInvite(inv)}
                    disabled={actingInviteId === inv.id}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="max-w-3xl">
        <h2 className="text-lg font-semibold mb-4">Add availability</h2>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Date</label>
            <input
              id="avail-date"
              type="date"
              value={availableDate}
              onChange={(e) => setAvailableDate(e.target.value)}
              min={localDateInputMin()}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Start</label>
            <input
              id="avail-start"
              type="time"
              value={startTime}
              min={isToday ? currentTimeStr : undefined}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">End</label>
            <input
              id="avail-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Duration (min)</label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {[30, 45, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDurationMode('preset');
                      setPresetDuration(d);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${durationMode === 'preset' && presetDuration === d ? 'bg-growe border-growe-dark text-slate-900' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}
                  >
                    {d === 60 ? '1 hour' : `${d} min`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDurationMode('custom')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${durationMode === 'custom' ? 'bg-growe border-growe-dark text-slate-900' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}
                >
                  Custom
                </button>
              </div>
              {durationMode === 'custom' && (
                <input
                  type="number"
                  min={15}
                  max={480}
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value, 10) || 15)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 w-28"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Max per slot</label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxStudentsPerSlot}
              onChange={(e) => setMaxStudentsPerSlot(parseInt(e.target.value, 10))}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 w-24"
            />
          </div>
          <Button type="submit" disabled={saving || isAddInvalid} loading={saving}>
            Add
          </Button>
        </form>
        {durationExceedsWindow && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            ⚠️ Session duration ({effectiveDuration} min) exceeds the availability window ({windowMinutes} min). Reduce the duration or widen the time window.
          </div>
        )}
        {!durationExceedsWindow && estimatedSlots > 0 && availableDate && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
            ✓ Creates <strong>{estimatedSlots}</strong> bookable slot{estimatedSlots !== 1 ? 's' : ''} ({effectiveDuration} min each) on a 30-min grid
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Your availability</h2>
          <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <div className="text-slate-500 dark:text-slate-400">Loading…</div>
        ) : availability.length === 0 ? (
          <div className="text-slate-600 dark:text-slate-400">No availability added yet.</div>
        ) : (
          <ul className="space-y-2">
            {availability.map((a) => (
              <li
                key={a.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                {editingId === String(a.id) ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      <input type="date" value={editForm.availableDate} min={localDateInputMin()} onChange={(e) => setEditForm((p) => ({ ...p, availableDate: e.target.value }))} className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2" />
                      <input type="time" value={editForm.startTime} min={editForm.availableDate === todayStr ? currentTimeStr : undefined} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2" />
                      <input type="time" value={editForm.endTime} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2" />
                      <input type="number" min={15} max={480} value={editForm.durationMode === 'custom' ? editForm.sessionDuration : editForm.presetDuration} onChange={(e) => {
                        const n = parseInt(e.target.value, 10) || 15;
                        setEditForm((p) => p.durationMode === 'custom' ? { ...p, sessionDuration: n } : { ...p, presetDuration: n });
                      }} className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2" />
                      <input type="number" min={1} max={20} value={editForm.maxStudentsPerSlot} onChange={(e) => setEditForm((p) => ({ ...p, maxStudentsPerSlot: parseInt(e.target.value, 10) || 1 }))} className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={!editForm.startTime || !editForm.endTime || editForm.startTime >= editForm.endTime || (editForm.availableDate === todayStr && editForm.startTime < currentTimeStr)} onClick={() => saveEdit(a.id)}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-slate-800 dark:text-slate-200">
                      <span className="font-medium">{a.available_date}</span>{' '}
                      {a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)} · {a.session_duration} min · max {a.max_students_per_slot}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => beginEdit(a)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}>Delete</Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

