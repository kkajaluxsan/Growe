import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_PRIORITIES,
  minDatetimeLocalNow,
  isDeadlineInFuture,
  formatAssignmentApiError,
} from '../../constants/assignments';

export default function CreateAssignment() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [priority, setPriority] = useState('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const minLocal = useMemo(() => minDatetimeLocalNow(), []);

  useEffect(() => {
    const d = searchParams.get('date');
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    const startOfDay = new Date(`${d}T00:00:00`);
    const endOfDay = new Date(`${d}T23:59:59`);
    const now = new Date();
    if (endOfDay < now) {
      toast.error('That calendar day is in the past. Choose a future due date.');
      return;
    }
    const pick = startOfDay > now ? startOfDay : new Date(now.getTime() + 60000);
    const pad = (n) => String(n).padStart(2, '0');
    const local = `${pick.getFullYear()}-${pad(pick.getMonth() + 1)}-${pad(pick.getDate())}T${pad(pick.getHours())}:${pad(pick.getMinutes())}`;
    setDeadline(local);
  }, [searchParams, toast]);

  const fieldErrors = useMemo(() => {
    const e = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!deadline) e.deadline = 'Deadline is required';
    else if (!isDeadlineInFuture(deadline)) e.deadline = 'Deadline must be after the current date and time';
    return e;
  }, [title, description, deadline]);

  const showErrors = touched.all || Object.keys(touched).length > 0;
  const formInvalid = Object.keys(fieldErrors).length > 0;

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setTouched({ all: true });
    if (Object.keys(fieldErrors).length) {
      toast.error('Fix the highlighted fields before submitting.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/assignments', {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        deadline: new Date(deadline).toISOString(),
      });
      toast.success('Assignment created');
      navigate('/assignments');
    } catch (err) {
      toast.error(formatAssignmentApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">Add assignment</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 border border-slate-200 dark:border-slate-600">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, title: true }))}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            aria-invalid={showErrors && fieldErrors.title}
          />
          {showErrors && fieldErrors.title && <p className="text-sm text-red-600 mt-1">{fieldErrors.title}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            rows={4}
            aria-invalid={showErrors && fieldErrors.description}
          />
          {showErrors && fieldErrors.description && (
            <p className="text-sm text-red-600 mt-1">{fieldErrors.description}</p>
          )}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              {ASSIGNMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              {ASSIGNMENT_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Deadline</label>
          <input
            type="datetime-local"
            value={deadline}
            min={minLocal}
            onChange={(e) => setDeadline(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, deadline: true }))}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            aria-invalid={showErrors && fieldErrors.deadline}
          />
          {showErrors && fieldErrors.deadline && <p className="text-sm text-red-600 mt-1">{fieldErrors.deadline}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || formInvalid}
          className="bg-slate-800 dark:bg-growe dark:text-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 dark:hover:bg-growe-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating…' : 'Create'}
        </button>
      </form>
    </div>
  );
}
