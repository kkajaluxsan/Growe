import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';

const ONBOARDING_KEY = 'growe_onboarding_seen';

function StatCard({ title, value, icon, to, subtitle }) {
  const inner = (
    <Card className="h-full transition-all duration-200 hover:shadow-lg border-slate-200 dark:border-slate-700 hover:border-growe/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <span className="text-3xl opacity-90" aria-hidden>
          {icon}
        </span>
      </div>
    </Card>
  );
  if (to) {
    return (
      <Link to={to} className="block group">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { socket } = useSocket();
  const [resending, setResending] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({ groups: 0, bookings: 0, meetings: 0 });

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (seen) return;
    setShowOnboarding(true);
  }, []);

  const fetchStats = useCallback(() => {
    if (!user?.isVerified) return;
    const silent = { skipGlobalErrorToast: true };

    if (user?.roleName === 'admin') {
      api
        .get('/admin/metrics', silent)
        .then(({ data }) => {
          setStats({
            groups: data?.totalUsers ?? 0,
            bookings: data?.verifiedUsers ?? 0,
            meetings: data?.profileIncomplete ?? 0,
          });
        })
        .finally(() => setStatsLoading(false));
      return;
    }

    Promise.allSettled([
      api.get('/groups', silent),
      api.get('/bookings', silent),
      api.get('/meetings', silent),
    ])
    .then((results) => {
      const gRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const bRes = results[1].status === 'fulfilled' ? results[1].value : null;
      const mRes = results[2].status === 'fulfilled' ? results[2].value : null;
      const gData = gRes?.data;
      const bData = bRes?.data;
      const mData = mRes?.data;
      const groups = Array.isArray(gData) ? gData.length : 0;
      const bookings = Array.isArray(bData)
        ? bData.filter((b) => b.status && ['pending', 'waiting_tutor_confirmation', 'confirmed'].includes(b.status)).length
        : 0;
      const now = Date.now();
      const meetings = Array.isArray(mData)
        ? mData.filter((m) => {
          if (m.ended_at) return false;
          if (!m.scheduled_at) return false;
          return new Date(m.scheduled_at).getTime() >= now;
        }).length
        : 0;
      setStats({ groups, bookings, meetings });
    })
    .finally(() => setStatsLoading(false));
  }, [user?.isVerified, user?.roleName]);

  useEffect(() => {
    setStatsLoading(true);
    fetchStats();
  }, [fetchStats]);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      // Refresh stats if a relevant event occurs across the app
      if (['booking', 'meeting', 'group', 'groupTutorInvite', 'admin_metric'].includes(notif.type)) {
        fetchStats();
      }
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, fetchStats]);

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
            <Button
              variant="secondary"
              size="sm"
              loading={resending}
              onClick={handleResendVerification}
            >
              Resend verification email
            </Button>
            <Link
              to={user?.email ? `/verify-email?email=${encodeURIComponent(user.email)}` : '/verify-email'}
              className="inline-flex items-center justify-center font-medium rounded-2xl shadow-sm bg-slate-100 text-slate-800 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500 px-3 py-1.5 text-sm"
            >
              Open verification page
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const tiles =
    user?.roleName === 'admin'
      ? [
        { to: '/admin', title: 'Admin console', desc: 'Users, audit log, and platform metrics (same database)', icon: '🛡️' },
        { to: '/assignments', title: 'Assignments', desc: 'Review or manage assignments', icon: '📋' },
        { to: '/messages', title: 'Messages', desc: 'Chat with users', icon: '💬' },
        { to: '/ai-assistant', title: 'AI Assistant', desc: 'Campus AI tools', icon: '✨' },
      ]
      : [
        { to: '/groups', title: 'Study Groups', desc: 'Create and join study groups', icon: '👥' },
        { to: '/assignments', title: 'Assignments', desc: 'Manage your academic planner', icon: '📋' },
        { to: '/tutors', title: 'Bookings', desc: 'Book peer tutoring sessions', icon: '🎓' },
        { to: '/meetings', title: 'Planner', desc: 'Schedule and join meetings', icon: '📹' },
        { to: '/messages', title: 'Messages', desc: 'Chat with groups and contacts', icon: '💬' },
      ];

  const statCards =
    user?.roleName === 'admin'
      ? [
        {
          title: 'Total users',
          value: statsLoading ? '—' : stats.groups,
          icon: '👤',
          to: '/admin',
          subtitle: 'All accounts in the app database',
        },
        {
          title: 'Verified users',
          value: statsLoading ? '—' : stats.bookings,
          icon: '✓',
          to: '/admin',
          subtitle: 'Email / identity verified',
        },
        {
          title: 'Profiles incomplete',
          value: statsLoading ? '—' : stats.meetings,
          icon: '⚠️',
          to: '/admin',
          subtitle: 'Verified, academic profile pending',
        },
      ]
      : [
        {
          title: 'Total groups',
          value: statsLoading ? '—' : stats.groups,
          icon: '👥',
          to: '/groups',
          subtitle: 'Study groups you’re in',
        },
        {
          title: 'Active bookings',
          value: statsLoading ? '—' : stats.bookings,
          icon: '🎓',
          to: '/tutors',
          subtitle: 'Pending or confirmed',
        },
        {
          title: 'Upcoming meetings',
          value: statsLoading ? '—' : stats.meetings,
          icon: '📅',
          to: '/meetings',
          subtitle: 'Scheduled ahead',
        },
      ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Welcome, {user?.displayName || user?.email}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Here’s what’s going on in your workspace.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {statCards.map((s) => (
          <StatCard
            key={s.title}
            title={s.title}
            value={s.value}
            icon={s.icon}
            to={s.to}
            subtitle={s.subtitle}
          />
        ))}
      </div>

      {showOnboarding && user?.roleName !== 'admin' && (
        <Card className="border-growe/40 bg-growe/10 dark:bg-growe/15">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Welcome to GROWE</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Here’s a quick overview of what you can do:</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                <li><strong>Planner</strong> — Start or join real-time video meetings from your study groups.</li>
                <li><strong>Messages</strong> — Message your groups and contacts in real time.</li>
                <li><strong>Bookings</strong> — Schedule sessions with tutors.</li>
                <li><strong>Study groups</strong> — Create or join groups to collaborate with peers.</li>
              </ul>
            </div>
            <Button variant="secondary" size="sm" onClick={dismissOnboarding} className="shrink-0">
              Got it
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {tiles.map(({ to, title, desc, icon }) => (
            <Link key={to} to={to} className="block group">
              <Card className="h-full transition-all duration-200 group-hover:shadow-lg border-slate-200 dark:border-slate-700 hover:border-growe/40">
                <span className="text-2xl" aria-hidden>
                  {icon}
                </span>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mt-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
