import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

function parseNotificationMetadata(n) {
  const m = n?.metadata;
  if (m == null) return {};
  if (typeof m === 'string') {
    try {
      return JSON.parse(m);
    } catch {
      return {};
    }
  }
  return typeof m === 'object' ? m : {};
}

/** Returns a client path to open for this notification, or null if none. */
function getNotificationPath(n, user) {
  const meta = parseNotificationMetadata(n);
  const t = n?.type;
  const isTutor = user?.roleName === 'tutor';

  if (t === 'assignment' && meta.assignmentId) {
    return `/assignments/${meta.assignmentId}`;
  }
  if (t === 'booking') {
    return isTutor ? '/tutors?tab=bookings' : '/tutors';
  }
  if (t === 'meeting' && meta.meetingId) {
    return `/meetings/${meta.meetingId}`;
  }
  if (t === 'group') {
    // Tutors are not group members until they accept; group detail would 403. Send them to dashboard invites/bookings.
    if (meta.event === 'group_tutor_invite') return '/tutors?tab=bookings';
    if (meta.groupId) return `/groups/${meta.groupId}`;
    if (meta.meetingId) return `/meetings/${meta.meetingId}`;
    if (meta.event === 'group_tutor_invite_rejected') return '/groups';
  }

  if (meta.event === 'rating_prompt') {
    return '/tutors';
  }

  return null;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: 25 } });
      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      setItems(list);
      setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNew = () => {
      load();
    };
    socket.on('notification', onNew);
    return () => socket.off('notification', onNew);
  }, [socket, load]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const markRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const handleItemClick = async (n) => {
    const path = getNotificationPath(n, user);
    if (!n.is_read) {
      await markRead(n.id);
    }
    if (path) {
      const meta = parseNotificationMetadata(n);
      if (meta.event === 'rating_prompt' && meta.bookingId) {
        navigate(path, { state: { promptRatingBookingId: meta.bookingId } });
      } else {
        navigate(path);
      }
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-growe/10 dark:hover:bg-growe/15 transition-all duration-200"
        aria-label="Notifications"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] max-h-[min(70vh,24rem)] overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-600 bg-white/95 dark:bg-slate-800/95 shadow-xl z-50 flex flex-col backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-growe-dark dark:text-growe/90 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && items.length === 0 && (
              <p className="p-4 text-sm text-slate-500 text-center">Loading…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="p-4 text-sm text-slate-500 text-center">No notifications yet.</p>
            )}
            {items.map((n) => {
              const path = getNotificationPath(n, user);
              return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150 ${
                  !n.is_read ? 'bg-growe/5 dark:bg-growe/10' : ''
                } ${path ? 'cursor-pointer' : ''}`}
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{n.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                </p>
              </button>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
