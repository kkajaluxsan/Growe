import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  getEditAssignmentErrors,
  formatAssignmentApiError,
  dbStatusToApiValue,
  priorityToApiValue,
} from '../../constants/assignments';
import { fieldLabel, fieldInputClass } from './assignmentFormStyles';

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
  const [visibleToAll, setVisibleToAll] = useState(false);

  const isAdmin = user?.roleName === 'admin';
  const isCompleted = initialStatusDb === 'completed';
  const completedLocked = isCompleted && (!isAdmin || !adminOverrideCompleted);
  const readOnlySchoolwide = visibleToAll && !isAdmin;
  const formLocked = completedLocked || readOnlySchoolwide;

  const minLocal = useMemo(() => minDatetimeLocalNow(), []);

  const deadlineInputMin = useMemo(() => {
    if (readOnlySchoolwide || completedLocked) return undefined;
    const initialPast =
      initialDeadlineLocal &&
      !Number.isNaN(new Date(initialDeadlineLocal).getTime()) &&
      new Date(initialDeadlineLocal).getTime() <= Date.now();
    if (initialPast && deadline === initialDeadlineLocal) return undefined;
    return minLocal;
  }, [readOnlySchoolwide, completedLocked, initialDeadlineLocal, deadline, minLocal]);

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
        setVisibleToAll(!!data.visibleToAll);
        setLoadError('');
      })
      .catch(() => setLoadError('Failed to load assignment'))
      .finally(() => setFetching(false));
  }, [id]);

  const fieldErrors = useMemo(
    () => getEditAssignmentErrors({ title, description, deadline, initialDeadlineLocal }),
    [title, description, deadline, initialDeadlineLocal]
  );

  const showErrors = touched.all || Object.keys(touched).length > 0;

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setTouched({ all: true });
    if (readOnlySchoolwide) {
      return;
    }
    if (completedLocked) {
      toast.error('Completed assignments cannot be edited without admin override.');
      return;
    }
    const errs = getEditAssignmentErrors({ title, description, deadline, initialDeadlineLocal });
    if (Object.keys(errs).length) {
      toast.error('Please fix the highlighted fields.');
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
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <Card>
          <div className="space-y-4">
            <div className="h-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <p className="text-center text-red-600 dark:text-red-400">{loadError}</p>
          <div className="mt-4 flex justify-center">
            <Button type="button" variant="secondary" onClick={() => navigate('/assignments')}>
              Back to assignments
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader
          title={readOnlySchoolwide ? 'Assignment details' : 'Edit assignment'}
          subtitle={
            readOnlySchoolwide
              ? 'This assignment was shared with everyone. You can view the details below.'
              : 'Update details below. Saving applies your changes immediately.'
          }
        />
        {readOnlySchoolwide && (
          <div className="mb-6 rounded-xl border border-growe/40 bg-growe/10 p-4 text-sm text-slate-800 dark:border-growe/50 dark:bg-growe/15 dark:text-slate-200">
            View only — only administrators can change or remove schoolwide assignments.
          </div>
        )}
        {isCompleted && (
          <div
            className={`mb-6 rounded-xl p-4 text-sm ${
              isAdmin
                ? 'border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
                : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300'
            }`}
          >
            {isAdmin ? (
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={adminOverrideCompleted}
                  onChange={(e) => setAdminOverrideCompleted(e.target.checked)}
                  disabled={readOnlySchoolwide}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
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

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="edit-title" className={fieldLabel}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              maxLength={ASSIGNMENT_TITLE_MAX}
              disabled={formLocked}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              className={`mt-1.5 ${fieldInputClass(showErrors && !!fieldErrors.title)} disabled:opacity-60`}
              aria-invalid={showErrors && !!fieldErrors.title}
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{showErrors && fieldErrors.title ? <span className="text-red-600">{fieldErrors.title}</span> : <span />}</span>
              <span>
                {title.length}/{ASSIGNMENT_TITLE_MAX}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="edit-desc" className={fieldLabel}>
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="edit-desc"
              value={description}
              maxLength={ASSIGNMENT_DESCRIPTION_MAX}
              disabled={formLocked}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, description: true }))}
              rows={5}
              className={`mt-1.5 ${fieldInputClass(showErrors && !!fieldErrors.description)} disabled:opacity-60`}
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>
                {showErrors && fieldErrors.description ? <span className="text-red-600">{fieldErrors.description}</span> : <span />}
              </span>
              <span>
                {description.length}/{ASSIGNMENT_DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-status" className={fieldLabel}>
                Status
              </label>
              <select
                id="edit-status"
                value={status}
                disabled={formLocked}
                onChange={(e) => setStatus(e.target.value)}
                className={`mt-1.5 ${fieldInputClass(false)} disabled:opacity-60`}
              >
                {ASSIGNMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-priority" className={fieldLabel}>
                Priority
              </label>
              <select
                id="edit-priority"
                value={priority}
                disabled={formLocked}
                onChange={(e) => setPriority(e.target.value)}
                className={`mt-1.5 ${fieldInputClass(false)} disabled:opacity-60`}
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
            <label htmlFor="edit-deadline" className={fieldLabel}>
              Deadline <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-deadline"
              type="datetime-local"
              value={deadline}
              min={deadlineInputMin}
              disabled={formLocked}
              onChange={(e) => setDeadline(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, deadline: true }))}
              className={`mt-1.5 ${fieldInputClass(showErrors && !!fieldErrors.deadline)} disabled:opacity-60`}
            />
            {showErrors && fieldErrors.deadline && <p className="mt-1 text-sm text-red-600">{fieldErrors.deadline}</p>}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {!readOnlySchoolwide && (
              <Button type="submit" disabled={loading || completedLocked}>
                {loading ? 'Saving…' : 'Save changes'}
              </Button>
            )}
            <Button type="button" variant="secondary" disabled={loading} onClick={() => navigate('/assignments')}>
              {readOnlySchoolwide ? 'Back to assignments' : 'Cancel'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
