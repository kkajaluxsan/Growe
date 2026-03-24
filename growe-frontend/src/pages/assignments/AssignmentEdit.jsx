import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_PRIORITIES,
  minDatetimeLocalNow,
  isDeadlineValidOnUpdate,
  formatAssignmentApiError,
  dbStatusToApiValue,
  priorityToApiValue,
} from '../../constants/assignments';

export default function AssignmentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [priority, setPriority] = useState('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initialStatusDb, setInitialStatusDb] = useState('');
  const [initialDeadlineLocal, setInitialDeadlineLocal] = useState('');
  const [touched, setTouched] = useState({});
  const [adminOverrideCompleted, setAdminOverrideCompleted] = useState(false);

  const isAdmin = user?.roleName === 'admin';
  const isCompleted = initialStatusDb === 'completed';
  const completedLocked = isCompleted && (!isAdmin || !adminOverrideCompleted);

  const minLocal = useMemo(() => minDatetimeLocalNow(), []);

  const deadlineInputMin = useMemo(() => {
    if (completedLocked) return undefined;
    const initialPast =
      initialDeadlineLocal &&
      !Number.isNaN(new Date(initialDeadlineLocal).getTime()) &&
      new Date(initialDeadlineLocal).getTime() <= Date.now();
    if (initialPast && deadline === initialDeadlineLocal) return undefined;
    return minLocal;
  }, [completedLocked, initialDeadlineLocal, deadline, minLocal]);

  useEffect(() => {
    setFetching(true);
    api
      .get(`/assignments/${id}`)
      .then(({ data }) => {
        setTitle(data.title);
        setDescription(data.description || '');
        setInitialStatusDb(data.status);
        setStatus(dbStatusToApiValue(data.status));
        setPriority(priorityToApiValue(data.priority, data.priorityLabel));
        const dl = data.deadline ? data.deadline.slice(0, 16) : '';
        setDeadline(dl);
        setInitialDeadlineLocal(dl);
        setLoadError('');
      })
      .catch(() => setLoadError('Failed to load assignment'))
      .finally(() => setFetching(false));
  }, [id]);

  const fieldErrors = useMemo(() => {
    const e = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!deadline) e.deadline = 'Deadline is required';
    else if (!isDeadlineValidOnUpdate(deadline, initialDeadlineLocal)) {
      e.deadline = 'When changing the deadline, pick a future date and time';
    }
    return e;
  }, [title, description, deadline, initialDeadlineLocal]);

  const showErrors = touched.all || Object.keys(touched).length > 0;
  const formInvalid = Object.keys(fieldErrors).length > 0 || completedLocked;

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setTouched({ all: true });
    if (completedLocked) {
      toast.error('Completed assignments cannot be edited without admin override.');
      return;
    }
    if (Object.keys(fieldErrors).length) {
      toast.error('Fix the highlighted fields before submitting.');
      return;
    }
    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        deadline: new Date(deadline).toISOString(),
      };
      if (isCompleted && isAdmin && adminOverrideCompleted) {
        body.adminOverrideCompleted = true;
      }
      await api.patch(`/assignments/${id}`, body);
      toast.success('Assignment updated');
      navigate('/assignments');
    } catch (err) {
      toast.error(formatAssignmentApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 dark:border-growe" />;
  }
  if (loadError) {
    return <div className="text-red-600 dark:text-red-400">{loadError}</div>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">Edit assignment</h1>
      {isCompleted && (
        <div
          className={`mb-4 rounded-lg p-3 text-sm ${
            isAdmin
              ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {isAdmin ? (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={adminOverrideCompleted}
                onChange={(e) => setAdminOverrideCompleted(e.target.checked)}
                className="mt-1"
              />
              <span>
                This assignment is completed. Check this box to allow edits or status changes (admin override).
              </span>
            </label>
          ) : (
            <span>This assignment is completed and cannot be changed. Contact an administrator if you need it reopened.</span>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 shadow rounded-lg p-6 border border-slate-200 dark:border-slate-600">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Title</label>
          <input
            type="text"
            value={title}
            disabled={completedLocked}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, title: true }))}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-60"
          />
          {showErrors && fieldErrors.title && <p className="text-sm text-red-600 mt-1">{fieldErrors.title}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            value={description}
            disabled={completedLocked}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-60"
            rows={4}
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
              disabled={completedLocked}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-60"
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
              disabled={completedLocked}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-60"
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
            min={deadlineInputMin}
            disabled={completedLocked}
            onChange={(e) => setDeadline(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, deadline: true }))}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-60"
          />
          {showErrors && fieldErrors.deadline && <p className="text-sm text-red-600 mt-1">{fieldErrors.deadline}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || formInvalid}
          className="bg-slate-800 dark:bg-growe dark:text-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 dark:hover:bg-growe-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
