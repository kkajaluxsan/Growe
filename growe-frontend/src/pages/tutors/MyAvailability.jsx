import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export default function MyAvailability() {
  const { toast } = useToast();
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  const [availableDate, setAvailableDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [maxStudentsPerSlot, setMaxStudentsPerSlot] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/tutors/availability')
      .then(({ data }) => setAvailability(Array.isArray(data) ? data : []))
      .catch(() => setAvailability([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/tutors/availability', {
        availableDate,
        startTime: startTime + ':00',
        endTime: endTime + ':00',
        sessionDuration,
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Availability</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Add the time windows you’re available to tutor. Students will book session slots generated from these windows.
        </p>
      </div>

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
              type="date"
              value={availableDate}
              onChange={(e) => setAvailableDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Duration (min)</label>
            <input
              type="number"
              min={15}
              max={480}
              value={sessionDuration}
              onChange={(e) => setSessionDuration(parseInt(e.target.value, 10))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 w-28"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Max per slot</label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxStudentsPerSlot}
              onChange={(e) => setMaxStudentsPerSlot(parseInt(e.target.value, 10))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 w-24"
            />
          </div>
          <Button type="submit" disabled={saving} loading={saving}>
            Add
          </Button>
        </form>
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
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <span className="text-sm text-slate-800 dark:text-slate-200">
                  <span className="font-medium">{a.available_date}</span>{' '}
                  {a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)} · {a.session_duration} min · max {a.max_students_per_slot}
                </span>
                <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

