import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { normalizeListResponse } from '../../constants/assignments';

function getMonthStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x.toISOString().slice(0, 10);
}
function getMonthEnd(d) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return x.toISOString();
}
function getDayKey(date) {
  return typeof date === 'string' ? date.slice(0, 10) : new Date(date).toISOString().slice(0, 10);
}

function todayLocalDateString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AssignmentCalendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cursor, setCursor] = useState(() => new Date());
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const from = useMemo(() => getMonthStart(cursor), [cursor]);
  const to = useMemo(() => getMonthEnd(cursor), [cursor]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/assignments', {
        params: {
          deadlineAfter: `${from}T00:00:00`,
          deadlineBefore: to,
          sortBy: 'deadline',
          sortOrder: 'asc',
          limit: 100,
          offset: 0,
        },
      })
      .then(({ data }) => {
        const { assignments: list } = normalizeListResponse(data);
        setAssignments(Array.isArray(list) ? list : []);
      })
      .catch(() => toast.error('Failed to load assignments for this month'))
      .finally(() => setLoading(false));
  }, [from, to, toast]);

  const byDay = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (!a.deadline) return;
      const key = getDayKey(a.deadline);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [assignments]);

  const monthLabel = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1));
  const nextMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1));

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = todayLocalDateString();

  const goCreateForDay = (dateStr) => {
    if (dateStr < today) {
      toast.error('Assignments cannot be created with deadlines in the past');
      return;
    }
    navigate(`/assignments/new?date=${dateStr}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Due dates</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={prevMonth}>
            ← Prev
          </Button>
          <span className="min-w-[140px] text-center font-medium text-slate-700 dark:text-slate-200">{monthLabel}</span>
          <Button variant="secondary" size="sm" onClick={nextMonth}>
            Next →
          </Button>
          <Link
            to="/assignments/new"
            className="font-medium rounded-2xl shadow-md hover:shadow-lg transition-all px-3 py-1.5 text-sm bg-growe text-slate-900 hover:bg-growe-light dark:bg-growe dark:text-slate-900"
          >
            New assignment
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <Card padding={false}>
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-600">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="p-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 border-r last:border-r-0 border-slate-200 dark:border-slate-600"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr min-h-[320px]">
            {blanks.map((_, i) => (
              <div
                key={`b-${i}`}
                className="min-h-[80px] p-1 border-b border-r border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"
              />
            ))}
            {days.map((d) => {
              const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayItems = byDay[dateStr] || [];
              const isPastDay = dateStr < today;
              return (
                <div
                  key={d}
                  className={`min-h-[80px] p-1 border-b border-r border-slate-200 dark:border-slate-600 ${
                    isPastDay ? 'bg-slate-100/80 dark:bg-slate-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{d}</span>
                    {!isPastDay && (
                      <button
                        type="button"
                        onClick={() => goCreateForDay(dateStr)}
                        className="text-[10px] font-medium text-growe hover:underline shrink-0"
                        title="Create assignment due this day"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 3).map((a) => (
                      <Link
                        key={a.id}
                        to={`/assignments/${a.id}`}
                        className={`block text-xs truncate rounded px-1 py-0.5 hover:opacity-90 ${
                          a.isOverdue
                            ? 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100'
                            : 'bg-growe/30 text-slate-800 dark:text-slate-200'
                        }`}
                        title={a.title}
                      >
                        {a.title}
                      </Link>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-xs text-slate-500">+{dayItems.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Overdue items (deadline passed and not completed) are highlighted in red. Use + Add on a future day to open the create form with that date; deadlines must still be in the future when you submit.
      </p>
    </div>
  );
}
