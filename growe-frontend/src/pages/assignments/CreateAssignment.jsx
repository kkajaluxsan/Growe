import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Card, { CardHeader } from '../../components/ui/Card';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_TITLE_MAX,
  ASSIGNMENT_DESCRIPTION_MAX,
  minDatetimeLocalNow,
  getCreateAssignmentErrors,
  formatAssignmentApiError,
} from '../../constants/assignments';
import { fieldLabel, fieldInputClass } from './assignmentFormStyles';

export default function CreateAssignment() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [priority, setPriority] = useState('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [visibleToAll, setVisibleToAll] = useState(false);

  // Expose state setters for E2E testing
  if (import.meta.env.VITE_TEST_MODE === 'true' || import.meta.env.DEV) {
    window._setAssignmentTitle = setTitle;
    window._setAssignmentDesc = setDescription;
    window._setAssignmentDeadline = setDeadline;
  }
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roleName === 'admin';
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

  const fieldErrors = useMemo(
    () => getCreateAssignmentErrors({ title, description, deadline }),
    [title, description, deadline]
  );

  const showErrors = touched.all || Object.keys(touched).length > 0;

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setTouched({ all: true });
    const errs = getCreateAssignmentErrors({ title, description, deadline });
    if (Object.keys(errs).length) {
      toast.error('Please fix the highlighted fields.');
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
        ...(isAdmin && visibleToAll ? { visibleToAll: true } : {}),
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
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader
          title="New assignment"
          subtitle={
            isAdmin
              ? 'Admins can optionally post for everyone. Title, description, and a future deadline are required.'
              : 'Title and description are required. Deadline must be in the future.'
          }
        />
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="assignment-title" className={fieldLabel}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="assignment-title"
              type="text"
              value={title}
              maxLength={ASSIGNMENT_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              className={`mt-1.5 ${fieldInputClass(showErrors && !!fieldErrors.title)}`}
              aria-invalid={showErrors && !!fieldErrors.title}
              aria-describedby={showErrors && fieldErrors.title ? 'err-title' : undefined}
              autoComplete="off"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{showErrors && fieldErrors.title ? <span id="err-title" className="text-red-600">{fieldErrors.title}</span> : <span />}</span>
              <span>
                {title.length}/{ASSIGNMENT_TITLE_MAX}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="assignment-desc" className={fieldLabel}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="assignment-desc"
              value={description}
              maxLength={ASSIGNMENT_DESCRIPTION_MAX}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, description: true }))}
              rows={5}
              className={`mt-1.5 ${fieldInputClass(showErrors && !!fieldErrors.description)}`}
              aria-invalid={showErrors && !!fieldErrors.description}
              aria-describedby={showErrors && fieldErrors.description ? 'err-desc' : undefined}
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>
                {showErrors && fieldErrors.description ? (
                  <span id="err-desc" className="text-red-600">
                    {fieldErrors.description}
                  </span>
                ) : (
                  <span />
                )}
              </span>
              <span>
                {description.length}/{ASSIGNMENT_DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="assignment-status" className={fieldLabel}>
                Status
              </label>
              <select
                id="assignment-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`mt-1.5 ${fieldInputClass(false)}`}
              >
                {ASSIGNMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assignment-priority" className={fieldLabel}>
                Priority
              </label>
              <select
                id="assignment-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={`mt-1.5 ${fieldInputClass(false)}`}
              >
                {ASSIGNMENT_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="assignment-deadline" className={fieldLabel}>
              Deadline <span className="text-red-500">*</span>
            </label>
            <input
              id="assignment-deadline"
              type="datetime-local"
              value={deadline}
              min={minLocal}
              onChange={(e) => setDeadline(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, deadline: true }))}
              className={`mt-1.5 ${fieldInputClass(showErrors && !!fieldErrors.deadline)}`}
              aria-invalid={showErrors && !!fieldErrors.deadline}
            />
            {showErrors && fieldErrors.deadline && <p className="mt-1 text-sm text-red-600">{fieldErrors.deadline}</p>}
          </div>

          {isAdmin && (
            <div className="rounded-xl border border-growe/30 bg-growe/5 p-4 dark:bg-growe/10">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={visibleToAll}
                  onChange={(e) => setVisibleToAll(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-growe-dark focus:ring-growe"
                />
                <span className="text-sm text-slate-800 dark:text-slate-100">
                  <span className="font-semibold">Visible to all students &amp; tutors</span>
                  <span className="mt-1 block text-slate-600 dark:text-slate-400">
                    Everyone with a verified account will see this assignment in their list and can open the details.
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create assignment'}
            </Button>
            <Button type="button" variant="secondary" disabled={loading} onClick={() => navigate('/assignments')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

