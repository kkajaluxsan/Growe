import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';

const ONBOARDING_KEY = 'growe_onboarding_seen';
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL || import.meta.env.VITE_ADMIN_EMAIL || '').trim();
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Icon({ name, className = 'h-5 w-5' }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
  if (name === 'users') return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></svg>;
  if (name === 'calendar') return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>;
  if (name === 'book') return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
  if (name === 'chat') return <svg {...common}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5h-8l-2.5 2.5V11.5A8.5 8.5 0 1 1 21 11.5z" /></svg>;
  if (name === 'video') return <svg {...common}><rect x="2" y="7" width="15" height="10" rx="2" /><path d="m17 10 5-3v10l-5-3z" /></svg>;
  if (name === 'shield') return <svg {...common}><path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" /></svg>;
  if (name === 'spark') return <svg {...common}><path d="m12 2 2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2z" /></svg>;
  if (name === 'clock') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
}

function toDayKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Time not available';
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

function isSameLocalDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function withinScope(ts, scope) {
  const now = Date.now();
  if (!Number.isFinite(ts)) return false;
  if (scope === 'all') return ts >= now;
  if (scope === 'today') return isSameLocalDay(ts, now);
  return ts >= now && ts <= now + 7 * 24 * 60 * 60 * 1000;
}

function MiniAcademicCalendar({ highlightedDays }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const mondayStart = (first.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < mondayStart; i += 1) cells.push({ key: `empty-${i}`, day: null, hasEvent: false });
  for (let day = 1; day <= lastDate; day += 1) {
    const d = new Date(year, month, day);
    const key = toDayKey(d);
    cells.push({ key: `d-${day}`, day, hasEvent: key ? highlightedDays.has(key) : false });
  }

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-700 p-4 bg-white/80 dark:bg-slate-800/70">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(now)}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">{WEEK_DAYS.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c) => (
          <div key={c.key} className={`h-9 rounded-md text-xs flex items-center justify-center ${c.day == null ? 'text-transparent' : c.hasEvent ? 'bg-growe/25 text-slate-900 dark:text-slate-100 font-semibold ring-1 ring-growe/35' : 'text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-700/40'}`}>
            {c.day ?? '.'}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, to, subtitle }) {
  const inner = (
    <Card className="h-full transition-all duration-200 hover:shadow-lg border-slate-200 dark:border-slate-700 hover:border-growe/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <span className="rounded-lg bg-growe/15 p-2 text-growe-dark" aria-hidden><Icon name={icon} className="h-5 w-5" /></span>
      </div>
    </Card>
  );
  return to ? <Link to={to} className="block group">{inner}</Link> : inner;
}

function UniversityBanner({ userName }) {
  const today = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <section className="relative overflow-hidden rounded-2xl border border-growe/35 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-6 text-slate-100 shadow-[0_14px_34px_rgba(15,23,42,0.28)] sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-growe/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-growe">University Notice Board</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Welcome back, {userName}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">Your classes, submissions, and collaboration channels are active. Use this dashboard as your daily academic control center.</p>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-right backdrop-blur-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">Academic Date</p>
          <p className="mt-1 text-sm font-semibold text-white">{today}</p>
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket } = useSocket();

  const [resending, setResending] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [timelineScope, setTimelineScope] = useState('week');
  const [stats, setStats] = useState({ groups: 0, bookings: 0, meetings: 0, deadlines: 0 });
  const [scheduleItems, setScheduleItems] = useState([]);
  const [deadlineItems, setDeadlineItems] = useState([]);

  const supportMailTo = useMemo(() => {
    const subject = encodeURIComponent('GROWE Support Request');
    const body = encodeURIComponent(`Hello Admin,\n\nI need support with:\n\n- Issue:\n- Page/Feature:\n- Additional details:\n\nStudent: ${user?.displayName || user?.email || ''}\nEmail: ${user?.email || ''}\n\nThank you.`);
    return `mailto:${SUPPORT_EMAIL || ''}?subject=${subject}&body=${body}`;
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
  }, []);

  const fetchDashboardData = useCallback(() => {
    if (!user?.isVerified) return;
    const silent = { skipGlobalErrorToast: true };

    Promise.allSettled([
      api.get('/groups', silent),
      api.get('/bookings', silent),
      api.get('/meetings', silent),
      api.get('/assignments', { params: { sortBy: 'deadline', sortOrder: 'asc', limit: 30, offset: 0 }, skipGlobalErrorToast: true }),
      user?.roleName === 'admin' ? api.get('/admin/metrics', silent) : Promise.resolve(null),
    ]).then((results) => {
      const groupData = results[0].status === 'fulfilled' ? results[0].value?.data : [];
      const bookingData = results[1].status === 'fulfilled' ? results[1].value?.data : [];
      const meetingData = results[2].status === 'fulfilled' ? results[2].value?.data : [];
      const assignmentRes = results[3].status === 'fulfilled' ? results[3].value?.data : [];
      const adminMetrics = results[4].status === 'fulfilled' ? results[4].value?.data : null;

      const assignments = Array.isArray(assignmentRes) ? assignmentRes : Array.isArray(assignmentRes?.assignments) ? assignmentRes.assignments : [];
      const now = Date.now();

      const meetings = Array.isArray(meetingData)
        ? meetingData.filter((m) => !m.ended_at && m.scheduled_at && new Date(m.scheduled_at).getTime() >= now).map((m) => ({
            id: `meeting-${m.id}`,
            ts: new Date(m.scheduled_at).getTime(),
            dayKey: toDayKey(m.scheduled_at),
            title: m.title || 'Meeting',
            subtitle: m.group_name || 'Study group',
            when: m.scheduled_at,
            to: `/meetings/${m.id}`,
            type: 'Meeting',
          }))
        : [];

      const bookings = Array.isArray(bookingData)
        ? bookingData.filter((b) => b.start_time && ['pending', 'waiting_tutor_confirmation', 'confirmed'].includes(b.status)).map((b) => ({
            id: `booking-${b.id}`,
            ts: new Date(b.start_time).getTime(),
            dayKey: toDayKey(b.start_time),
            title: b.subject || 'Tutoring session',
            subtitle: b.tutor_display_name || b.tutor_email || 'Tutor session',
            when: b.start_time,
            to: '/tutors',
            type: 'Booking',
          })).filter((item) => Number.isFinite(item.ts) && item.ts >= now)
        : [];

      const deadlines = assignments.filter((a) => a?.deadline).map((a) => ({
        id: `assignment-${a.id}`,
        ts: new Date(a.deadline).getTime(),
        dayKey: toDayKey(a.deadline),
        title: a.title || 'Assignment',
        subtitle: (a.status || 'pending').replace('_', ' '),
        when: a.deadline,
        to: '/assignments',
        type: 'Deadline',
        status: (a.status || '').toLowerCase(),
      })).filter((item) => Number.isFinite(item.ts) && item.status !== 'completed');

      setScheduleItems([...meetings, ...bookings].sort((a, b) => a.ts - b.ts).slice(0, 10));
      setDeadlineItems(deadlines.sort((a, b) => a.ts - b.ts).slice(0, 10));

      if (user?.roleName === 'admin' && adminMetrics) {
        setStats({ groups: adminMetrics.totalUsers ?? 0, bookings: adminMetrics.verifiedUsers ?? 0, meetings: adminMetrics.profileIncomplete ?? 0, deadlines: deadlines.length });
      } else {
        setStats({ groups: Array.isArray(groupData) ? groupData.length : 0, bookings: bookings.length, meetings: meetings.length, deadlines: deadlines.length });
      }
    }).finally(() => setStatsLoading(false));
  }, [user?.isVerified, user?.roleName]);

  useEffect(() => {
    setStatsLoading(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      if (['booking', 'meeting', 'group', 'groupTutorInvite', 'admin_metric', 'assignment'].includes(notif.type)) fetchDashboardData();
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, fetchDashboardData]);

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification');
      toast.success('Verification email sent. Check your inbox.');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send verification email.');
    } finally {
      setResending(false);
    }
  };

  if (!user?.isVerified) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Welcome to GROWE</h1>
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="font-semibold text-amber-800 dark:text-amber-200">Verify your email</p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Check your inbox for the verification link. Some features are limited until verified.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={resending} onClick={handleResendVerification}>Resend verification email</Button>
            <Link to={user?.email ? `/verify-email?email=${encodeURIComponent(user.email)}` : '/verify-email'} className="inline-flex items-center justify-center font-medium rounded-xl shadow-sm bg-slate-100 text-slate-800 hover:bg-slate-200 px-3 py-1.5 text-sm">Open verification page</Link>
          </div>
        </Card>
      </div>
    );
  }

  const tiles = user?.roleName === 'admin'
    ? [
      { to: '/admin', title: 'Admin Console', desc: 'Users, verification, and metrics', icon: 'shield' },
      { to: '/assignments', title: 'Assignments', desc: 'Review assignment lifecycle', icon: 'book' },
      { to: '/messages', title: 'Messages', desc: 'Respond to platform conversations', icon: 'chat' },
      { to: '/ai-assistant', title: 'AI Assistant', desc: 'Campus AI tools', icon: 'spark' },
    ]
    : [
      { to: '/groups', title: 'Student Groups', desc: 'Create and join collaborative groups', icon: 'users' },
      { to: '/assignments', title: 'Assignment Hub', desc: 'Track deadlines and status', icon: 'book' },
      { to: '/tutors', title: 'Tutor Booking', desc: 'Book and manage tutoring sessions', icon: 'clock' },
      { to: '/meetings', title: 'Meeting Rooms', desc: 'Schedule and join calls', icon: 'video' },
      { to: '/messages', title: 'Messages Center', desc: 'Contact peers, tutors, and support', icon: 'chat' },
    ];

  const highlightDays = useMemo(() => new Set([...scheduleItems, ...deadlineItems].map((item) => item.dayKey).filter(Boolean)), [scheduleItems, deadlineItems]);
  const scopedSchedule = useMemo(() => scheduleItems.filter((item) => withinScope(item.ts, timelineScope)), [scheduleItems, timelineScope]);
  const scopedDeadlines = useMemo(() => deadlineItems.filter((item) => withinScope(item.ts, timelineScope)), [deadlineItems, timelineScope]);

  const todayMeetingCount = scheduleItems.filter((item) => item.type === 'Meeting' && isSameLocalDay(item.when, Date.now())).length;
  const todayBookingCount = scheduleItems.filter((item) => item.type === 'Booking' && isSameLocalDay(item.when, Date.now())).length;
  const todayDeadlineCount = deadlineItems.filter((item) => isSameLocalDay(item.when, Date.now())).length;

  const statCards = [
    { title: user?.roleName === 'admin' ? 'Total users' : 'Total groups', value: statsLoading ? '-' : stats.groups, icon: 'users', to: user?.roleName === 'admin' ? '/admin' : '/groups', subtitle: user?.roleName === 'admin' ? 'All accounts' : 'Your study groups' },
    { title: user?.roleName === 'admin' ? 'Verified users' : 'Active bookings', value: statsLoading ? '-' : stats.bookings, icon: 'clock', to: user?.roleName === 'admin' ? '/admin' : '/tutors', subtitle: user?.roleName === 'admin' ? 'Identity verified' : 'Pending or confirmed' },
    { title: user?.roleName === 'admin' ? 'Profiles incomplete' : 'Upcoming meetings', value: statsLoading ? '-' : stats.meetings, icon: 'calendar', to: user?.roleName === 'admin' ? '/admin' : '/meetings', subtitle: user?.roleName === 'admin' ? 'Profile pending' : 'Scheduled meetings' },
    { title: 'Open deadlines', value: statsLoading ? '-' : stats.deadlines, icon: 'book', to: '/assignments', subtitle: 'Incomplete assignments' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="University Dashboard"
        subtitle={`Welcome ${user?.displayName || user?.email}. Access your academic services and schedule from one place.`}
        actions={<div className="flex flex-wrap gap-2"><Link to="/assignments" className="inline-flex items-center justify-center rounded-lg bg-growe px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-growe-light transition-colors">Open Assignments</Link><Link to="/meetings" className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Open Meetings</Link></div>}
      />

      <UniversityBanner userName={user?.displayName || user?.email || 'Student'} />

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <Card className="border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Need Support</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Student Support Desk</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">If needed, contact admin directly with your issue details.</p>
          <div className="mt-4 space-y-2 text-sm">
            <a href={supportMailTo} className="block rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40">{SUPPORT_EMAIL ? `Email support (${SUPPORT_EMAIL})` : 'Email Admin'}</a>
            <Link to="/profile" className="block rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40">Update Student Profile</Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{statCards.map((s) => <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} to={s.to} subtitle={s.subtitle} />)}</div>

      {user?.roleName !== 'admin' && <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"><Card><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Today</p><p className="mt-2 text-2xl font-bold">{todayMeetingCount}</p><p className="text-sm text-slate-500">Meetings</p></Card><Card><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Today</p><p className="mt-2 text-2xl font-bold">{todayBookingCount}</p><p className="text-sm text-slate-500">Tutor sessions</p></Card><Card><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Today</p><p className="mt-2 text-2xl font-bold">{todayDeadlineCount}</p><p className="text-sm text-slate-500">Deadlines</p></Card></div>}

      {showOnboarding && user?.roleName !== 'admin' && <Card className="border-growe/40 bg-growe/10 dark:bg-growe/15"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Welcome to GROWE</h2><p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Quick start:</p><ul className="mt-3 space-y-1.5 text-sm text-slate-700 dark:text-slate-200"><li><strong>Meetings</strong> - Join collaboration sessions.</li><li><strong>Assignments</strong> - Track upcoming deadlines.</li><li><strong>Bookings</strong> - Manage tutoring support.</li></ul></div><Button variant="secondary" size="sm" onClick={dismissOnboarding} className="shrink-0">Got it</Button></div></Card>}

      <div>
        <h2 className="ui-section-title mb-4">Service Blocks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {tiles.map(({ to, title, desc, icon }) => (<Link key={to} to={to} className="block group"><Card className="h-full transition-all duration-200 group-hover:shadow-lg border-slate-200 dark:border-slate-700 hover:border-growe/40"><div className="h-12 rounded-lg bg-gradient-to-r from-growe/25 via-growe/12 to-transparent mb-3 flex items-center px-3 text-growe-dark"><Icon name={icon} className="h-5 w-5" /></div><h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mt-2">{title}</h3><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{desc}</p></Card></Link>))}
        </div>
      </div>

      {user?.roleName !== 'admin' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <Card className="xl:col-span-2 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="ui-section-title">Academic Timeline</h2>
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">{[{ id: 'today', label: 'Today' }, { id: 'week', label: '7 Days' }, { id: 'all', label: 'All Upcoming' }].map((scope) => <button key={scope.id} type="button" onClick={() => setTimelineScope(scope.id)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${timelineScope === scope.id ? 'bg-growe text-slate-900' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>{scope.label}</button>)}</div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Meetings and Bookings</p><Link to="/meetings" className="text-xs font-semibold text-growe-dark hover:underline">View all</Link></div>
              {scopedSchedule.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">No meeting or booking items in this period.</p> : <div className="space-y-2">{scopedSchedule.map((item) => <Link key={item.id} to={item.to} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.type} - {item.subtitle}</p></div><p className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(item.when)}</p></Link>)}</div>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assignment Deadlines</p><Link to="/assignments" className="text-xs font-semibold text-growe-dark hover:underline">Open hub</Link></div>
              {scopedDeadlines.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">No assignment deadlines in this period.</p> : <div className="space-y-2">{scopedDeadlines.map((item) => <Link key={item.id} to={item.to} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">Deadline - {item.subtitle}</p></div><p className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDateTime(item.when)}</p></Link>)}</div>}
            </div>
          </Card>

          <Card>
            <h2 className="ui-section-title mb-4">Academic Calendar</h2>
            <MiniAcademicCalendar highlightedDays={highlightDays} />
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Highlighted dates include meetings, bookings, and deadlines.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
