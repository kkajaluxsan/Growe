import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import AssignmentCalendar from './AssignmentCalendar';
import {
  ASSIGNMENT_STATUSES_FILTER,
  ASSIGNMENT_PRIORITIES_FILTER,
  SORT_OPTIONS,
  normalizeListResponse,
  formatAssignmentApiError,
} from '../../constants/assignments';

const viewTabs = [
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
];

export default function AssignmentList() {
  const { toast } = useToast();
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

  const fetchList = useCallback(() => {
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
  }, [statusFilter, priorityFilter, deadlineAfter, deadlineBefore, sortBy, sortOrder, limit, offset, toast]);

  useEffect(() => {
    if (view === 'list') fetchList();
  }, [view, fetchList]);

  const handleDelete = async (aid) => {
    if (!confirm('Delete this assignment?')) return;
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Assignments</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5">
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === tab.id
                    ? 'bg-growe text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            to="/assignments/new"
            className="font-medium rounded-2xl shadow-md px-4 py-2 text-sm bg-slate-800 text-white hover:bg-slate-700 dark:bg-growe dark:text-slate-900 dark:hover:bg-growe-light"
          >
            Add assignment
          </Link>
        </div>
      </div>

      {view === 'calendar' ? (
        <AssignmentCalendar />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setOffset(0);
                  setStatusFilter(e.target.value);
                }}
                className="border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              >
                {ASSIGNMENT_STATUSES_FILTER.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setOffset(0);
                  setPriorityFilter(e.target.value);
                }}
                className="border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              >
                {ASSIGNMENT_PRIORITIES_FILTER.map((o) => (
                  <option key={o.value || 'all-p'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Due after</label>
              <input
                type="date"
                value={deadlineAfter}
                onChange={(e) => {
                  setOffset(0);
                  setDeadlineAfter(e.target.value);
                }}
                className="border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Due before</label>
              <input
                type="date"
                value={deadlineBefore}
                onChange={(e) => {
                  setOffset(0);
                  setDeadlineBefore(e.target.value);
                }}
                className="border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setOffset(0);
                  setSortBy(e.target.value);
                }}
                className="border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => {
                  setOffset(0);
                  setSortOrder(e.target.value);
                }}
                className="border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-growe" />
          ) : (
            <>
              <div className="space-y-4">
                {assignments.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400">No assignments match your filters.</p>
                ) : (
                  assignments.map((a) => (
                    <div
                      key={a.id}
                      className={`p-4 rounded-lg shadow border flex justify-between items-center gap-4 ${
                        a.isOverdue
                          ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                          : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-600'
                      }`}
                    >
                      <div>
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{a.title}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {a.status.replace(/_/g, ' ')} • {a.priorityLabel || `P${a.priority}`}
                          {a.isOverdue && (
                            <span className="ml-2 font-medium text-red-700 dark:text-red-300">Overdue</span>
                          )}
                        </p>
                        {a.deadline && (
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            Due: {new Date(a.deadline).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link to={`/assignments/${a.id}`} className="text-slate-600 dark:text-growe hover:underline text-sm">
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {total > limit && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Page {page} of {pageCount} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset((o) => Math.max(0, o - limit))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
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
        </>
      )}
    </div>
  );
}
