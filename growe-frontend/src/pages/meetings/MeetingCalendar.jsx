import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ShareButton from '../../components/ui/ShareButton';
import { useToast } from '../../context/ToastContext';

function getMonthStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x.toISOString().slice(0, 10);
}
function getMonthEnd(d) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return x.toISOString().slice(0, 10);
}
function getDayKey(date) {
  return typeof date === 'string' ? date.slice(0, 10) : new Date(date).toISOString().slice(0, 10);
}

const MEETING_OPEN_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

function getMeetingAnchorTime(meeting) {
  const raw = meeting?.scheduled_at || meeting?.created_at;
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function isMeetingExpired(meeting) {
  if (meeting?.ended_at) return true;
  const anchor = getMeetingAnchorTime(meeting);
  if (anchor == null) return false;
  return Date.now() - anchor > MEETING_OPEN_WINDOW_MS;
}

export default function MeetingCalendar() {
  const { toast } = useToast();
  const [cursor, setCursor] = useState(() => new Date());
  const [meetings, setMeetings] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ groupId: '', title: 'Group Meeting', date: '', time: '10:00' });
  const [creating, setCreating] = useState(false);

  const from = useMemo(() => getMonthStart(cursor), [cursor]);
  const to = useMemo(() => getMonthEnd(cursor), [cursor]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/meetings', { params: { from, to } }).then((r) => r.data),
      api.get('/groups').then((r) => r.data),
    ])
      .then(([meetingsData, groupsData]) => {
        setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
        setGroups(Array.isArray(groupsData) ? groupsData : []);
      })
      .catch(() => toast.error('Failed to load meetings'))
      .finally(() => setLoading(false));
  }, [from, to, toast]);

  const meetingsByDay = useMemo(() => {
    const map = {};
    meetings.forEach((m) => {
      const key = m.scheduled_at ? getDayKey(m.scheduled_at) : getDayKey(m.created_at);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [meetings]);

  const monthLabel = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1));
  const nextMonth = () => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1));

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!scheduleForm.groupId || !scheduleForm.date || !scheduleForm.time) {
      toast.error('Please select group, date and time');
      return;
    }
    const scheduledAt = `${scheduleForm.date}T${scheduleForm.time}:00`;
    setCreating(true);
    api
      .post('/meetings', {
        groupId: scheduleForm.groupId,
        title: scheduleForm.title || 'Group Meeting',
        scheduledAt,
      })
      .then(({ data }) => {
        toast.success('Meeting scheduled. Link: ' + (typeof window !== 'undefined' ? `${window.location.origin}/meetings/${data.id}` : ''));
        setScheduleOpen(false);
        setScheduleForm({ groupId: '', title: 'Group Meeting', date: '', time: '10:00' });
        setMeetings((prev) => [...prev, { ...data, scheduled_at: scheduledAt, group_name: groups.find((g) => g.id === scheduleForm.groupId)?.name }]);
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to schedule meeting'))
      .finally(() => setCreating(false));
  };

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Calendar</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={prevMonth}>
            ← Prev
          </Button>
          <span className="min-w-[140px] text-center font-medium text-slate-700 dark:text-slate-200">{monthLabel}</span>
          <Button variant="secondary" size="sm" onClick={nextMonth}>
            Next →
          </Button>
          <Button size="sm" className="bg-growe text-slate-900 hover:bg-growe-dark" onClick={() => setScheduleOpen(true)}>
            Schedule meeting
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <Card padding={false}>
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-600">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="p-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 border-r last:border-r-0 border-slate-200 dark:border-slate-600">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr min-h-[320px]">
            {blanks.map((_, i) => (
              <div key={`b-${i}`} className="min-h-[80px] p-1 border-b border-r border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50" />
            ))}
            {days.map((d) => {
              const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayMeetings = meetingsByDay[dateStr] || [];
              return (
                <div
                  key={d}
                  className="min-h-[80px] p-1 border-b border-r border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{d}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayMeetings.slice(0, 2).map((m) => (
                      isMeetingExpired(m) ? (
                        <span
                          key={m.id}
                          className="block text-xs truncate rounded px-1 py-0.5 bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed"
                          title="Meeting link expired"
                        >
                          {m.title}
                        </span>
                      ) : (
                        <Link
                          key={m.id}
                          to={`/meetings/${m.id}`}
                          className="block text-xs truncate rounded px-1 py-0.5 bg-growe/30 text-slate-800 dark:text-slate-200 hover:bg-growe/50"
                          title={m.title}
                        >
                          {m.title}
                        </Link>
                      )
                    ))}
                    {dayMeetings.length > 2 && <span className="text-xs text-slate-500">+{dayMeetings.length - 2}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Upcoming meetings</h3>
        <ul className="space-y-2">
          {meetings
            .filter((m) => !isMeetingExpired(m) && (m.scheduled_at ? new Date(m.scheduled_at) >= new Date() : true))
            .slice(0, 10)
            .map((m) => (
              <li key={m.id}>
                <Card className="flex flex-row items-center justify-between gap-3 py-2">
                  <div>
                    <Link to={`/meetings/${m.id}`} className="font-medium text-growe hover:underline">
                      {m.title}
                    </Link>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : new Date(m.created_at).toLocaleString()} · {m.group_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isMeetingExpired(m) ? (
                      <>
                        <a
                          href={`${baseUrl}/meetings/${m.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-growe hover:underline"
                        >
                          Open link
                        </a>
                        <ShareButton title={m.title} shareText={`Join: ${m.title}`} url={`${baseUrl}/meetings/${m.id}`} variant="secondary" size="sm" />
                      </>
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">Expired</span>
                    )}
                  </div>
                </Card>
              </li>
            ))}
        </ul>
        {meetings.length === 0 && !loading && <p className="text-slate-500 dark:text-slate-400 text-sm">No meetings this month.</p>}
      </div>

      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule meeting" size="md">
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Group</label>
            <select
              required
              value={scheduleForm.groupId}
              onChange={(e) => setScheduleForm((f) => ({ ...f, groupId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
            >
              <option value="">Select a group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={scheduleForm.title}
              onChange={(e) => setScheduleForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
              placeholder="Group Meeting"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
              <input
                type="time"
                required
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">A meeting link will be generated automatically after you schedule.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} className="bg-growe text-slate-900 hover:bg-growe-dark">
              Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
