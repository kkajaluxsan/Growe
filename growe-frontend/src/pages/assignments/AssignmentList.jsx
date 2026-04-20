import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Card, { CardHeader } from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import AssignmentCalendar from './AssignmentCalendar';
import {
  ASSIGNMENT_STATUSES_FILTER,
  ASSIGNMENT_PRIORITIES_FILTER,
  SORT_OPTIONS,
  normalizeListResponse,
  formatAssignmentApiError,
  formatAssignmentStatusLabel,
  listFilterDateRangeInvalid,
} from '../../constants/assignments';

const viewTabs = [
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
];

function StatusPill({ status }) {
  const s = (status || '').toLowerCase();
  const cls =
    s === 'completed'
      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
      : s === 'in_progress'
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {formatAssignmentStatusLabel(status)}
    </span>
  );
}

function PriorityBadge({ priorityLabel, priority }) {
  const label = priorityLabel || (priority === 1 ? 'LOW' : priority === 3 ? 'HIGH' : 'MEDIUM');
  const cls =
    label === 'HIGH'
      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100'
      : label === 'LOW'
        ? 'bg-slate-100 text-slate-700 dark:bg-slate-600/80 dark:text-slate-200'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100';
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export default function AssignmentList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.roleName === 'admin';
  const [view, setView] = useState('list');
  const [assignments, setAssignments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [deadlineAfter, setDeadlineAfter] = useState('');
  const [deadlineBefore, setDeadlineBefore] = useState('');
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);

  const filterRangeInvalid = useMemo(
    () => listFilterDateRangeInvalid(deadlineAfter, deadlineBefore),
    [deadlineAfter, deadlineBefore]
  );

  const fetchList = useCallback(() => {
    if (filterRangeInvalid) {
      setAssignments([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = {
      sortBy,
      sortOrder,
      limit,
      offset,
    };
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (deadlineAfter) params.deadlineAfter = `${deadlineAfter}T00:00:00`;
    if (deadlineBefore) params.deadlineBefore = `${deadlineBefore}T23:59:59`;

    api
      .get('/assignments', { params })
      .then(({ data }) => {
        const norm = normalizeListResponse(data);
        setAssignments(norm.assignments);
        setTotal(norm.total);
      })
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, [
    statusFilter,
    priorityFilter,
    deadlineAfter,
    deadlineBefore,
    sortBy,
    sortOrder,
    limit,
    offset,
    toast,
    filterRangeInvalid,
  ]);

  useEffect(() => {
    if (view === 'list') fetchList();
  }, [view, fetchList]);

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setDeadlineAfter('');
    setDeadlineBefore('');
    setSortBy('deadline');
    setSortOrder('asc');
    setOffset(0);
  };

  const handleDelete = async (aid) => {
    if (!confirm('Delete this assignment? This cannot be undone.')) return;
    try {
      await api.delete(`/assignments/${aid}`);
      toast.success('Assignment removed');
      setAssignments((prev) => prev.filter((a) => a.id !== aid));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      toast.error(formatAssignmentApiError(err));
    }
  };

  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const hasActiveFilters =
    statusFilter || priorityFilter || deadlineAfter || deadlineBefore || sortBy !== 'deadline' || sortOrder !== 'asc';

  const inputBase =
    'rounded-xl border py-2.5 px-3 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-shadow focus:border-growe focus:outline-none focus:ring-2 focus:ring-growe/30 dark:border-slate-600';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Assignments"
        subtitle="Track due dates, priorities, and progress in one place."
        actions={(
          <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-600">
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  view === tab.id
                    ? 'bg-growe text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            to="/assignments/new"
            className="inline-flex items-center justify-center rounded-xl bg-growe px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(46,232,160,0.25)] transition-all hover:bg-growe-light hover:shadow-[0_12px_24px_rgba(46,232,160,0.32)] focus:outline-none focus:ring-2 focus:ring-growe-dark focus:ring-offset-2"
          >
            Add assignment
          </Link>
          </div>
        )}
      />

      {view === 'calendar' ? (
        <AssignmentCalendar />
      ) : (
        <>
          <Card>
            <CardHeader
              title="Filters & sort"
              subtitle="Refine the list. Due date range must be valid (start ≤ end)."
              action={
                hasActiveFilters ? (
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                ) : null
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setOffset(0);
                    setStatusFilter(e.target.value);
                  }}
                  className={`w-full ${inputBase}`}
                >
                  {ASSIGNMENT_STATUSES_FILTER.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setOffset(0);
                    setPriorityFilter(e.target.value);
                  }}
                  className={`w-full ${inputBase}`}
                >
                  {ASSIGNMENT_PRIORITIES_FILTER.map((o) => (
                    <option key={o.value || 'all-p'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Due after</label>
                <input
                  type="date"
                  value={deadlineAfter}
                  onChange={(e) => {
                    setOffset(0);
                    setDeadlineAfter(e.target.value);
                  }}
                  className={`w-full ${inputBase} ${filterRangeInvalid ? 'border-red-500 ring-1 ring-red-500/30' : ''}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Due before</label>
                <input
                  type="date"
                  value={deadlineBefore}
                  onChange={(e) => {
                    setOffset(0);
                    setDeadlineBefore(e.target.value);
                  }}
                  className={`w-full ${inputBase} ${filterRangeInvalid ? 'border-red-500 ring-1 ring-red-500/30' : ''}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setOffset(0);
                    setSortBy(e.target.value);
                  }}
                  className={`w-full ${inputBase}`}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setOffset(0);
                    setSortOrder(e.target.value);
                  }}
                  className={`w-full ${inputBase}`}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
            {filterRangeInvalid && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
                “Due after” must be on or before “Due before”. Adjust the dates or clear the filters.
              </p>
            )}
          </Card>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80"
                />
              ))}
            </div>
          ) : filterRangeInvalid ? (
            <Card>
              <p className="text-center text-slate-600 dark:text-slate-400">Fix the date range above to load assignments.</p>
            </Card>
          ) : assignments.length === 0 ? (
            <Card className="text-center">
              <div className="py-10">
                <p className="text-lg font-medium text-slate-800 dark:text-slate-100">No assignments yet</p>
                <p className="mt-2 max-w-md mx-auto text-sm text-slate-600 dark:text-slate-400">
                  {hasActiveFilters
                    ? 'Nothing matches these filters. Try clearing filters or widening the due date range.'
                    : 'Create your first assignment to track coursework and deadlines.'}
                </p>
                <Link
                  to="/assignments/new"
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-growe px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(46,232,160,0.25)] transition-all hover:bg-growe-light hover:shadow-[0_12px_24px_rgba(46,232,160,0.32)] focus:outline-none focus:ring-2 focus:ring-growe-dark focus:ring-offset-2"
                >
                  Create assignment
                </Link>
              </div>
            </Card>
          ) : (
            <ul className="space-y-3">
              {assignments.map((a) => (
                <li key={a.id}>
                  <Card
                    className={`transition-shadow hover:shadow-lg ${
                      a.isOverdue ? 'border-red-200/80 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{a.title}</h2>
                          {a.visibleToAll && (
                            <span className="rounded-full bg-growe/25 px-2 py-0.5 text-xs font-semibold text-growe-dark dark:text-growe">
                              Everyone
                            </span>
                          )}
                          {a.isOverdue && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill status={a.status} />
                          <PriorityBadge priorityLabel={a.priorityLabel} priority={a.priority} />
                        </div>
                        {a.deadline && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Due:</span>{' '}
                            {new Date(a.deadline).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
                        <Link
                          to={`/assignments/${a.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          {a.visibleToAll && !isAdmin && a.user_id !== user?.id ? 'View' : 'Edit'}
                        </Link>
                        {(isAdmin || (a.user_id === user?.id && !a.visibleToAll)) && (
                          <Button variant="danger" size="sm" type="button" onClick={() => handleDelete(a.id)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {!loading && !filterRangeInvalid && total > limit && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {pageCount} · {total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset((o) => o + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
