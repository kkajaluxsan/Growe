import { useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

/** Socket `notification` events that should surface as in-app toast + browser Notification (Teams-like). */
const DESKTOP_EVENTS = new Set(['booking_imminent', 'booking_reminder_tutor', 'booking_reminder']);
const REMINDER_WINDOW_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const SEEN_KEY_PREFIX = 'growe-reminder-v1';

function tryDesktopNotification(title, body, tag, path) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    try {
      const n = new Notification(title, { body, tag });
      if (path) {
        n.onclick = () => {
          try {
            window.focus();
            window.location.assign(path);
          } catch {
            // ignore
          }
        };
      }
    } catch {
      /* ignore */
    }
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((p) => {
      if (p === 'granted') {
        try {
          const n = new Notification(title, { body, tag });
          if (path) {
            n.onclick = () => {
              try {
                window.focus();
                window.location.assign(path);
              } catch {
                // ignore
              }
            };
          }
        } catch {
          /* ignore */
        }
      }
    });
  }
}

export default function BookingSessionDesktopAlerts() {
  const { socket } = useSocket();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const shownRef = useRef(new Set());

  const hasShown = (key) => {
    if (shownRef.current.has(key)) return true;
    try {
      if (localStorage.getItem(`${SEEN_KEY_PREFIX}:${key}`) === '1') {
        shownRef.current.add(key);
        return true;
      }
    } catch {
      // ignore storage failures
    }
    return false;
  };

  const markShown = (key) => {
    shownRef.current.add(key);
    try {
      localStorage.setItem(`${SEEN_KEY_PREFIX}:${key}`, '1');
    } catch {
      // ignore storage failures
    }
  };

  const notifySoon = (title, body, key, path) => {
    if (hasShown(key)) return;
    markShown(key);
    toastRef.current(body, { duration: 9000, variant: 'warning' });
    tryDesktopNotification(title, body, key, path);
  };

  const checkUpcomingSessions = async () => {
    const now = Date.now();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      const [{ data: meetingsData }, { data: bookingsData }] = await Promise.all([
        api.get('/meetings', { skipGlobalErrorToast: true }),
        api.get('/bookings', { params: { limit: 50, offset: 0 }, skipGlobalErrorToast: true }),
      ]);

      const meetings = Array.isArray(meetingsData) ? meetingsData : [];
      meetings.forEach((m) => {
        if (m?.ended_at) return;
        if (!m?.scheduled_at) return;
        const startTs = new Date(m.scheduled_at).getTime();
        if (Number.isNaN(startTs) || startTs <= now) return;
        const msUntil = startTs - now;
        if (msUntil > REMINDER_WINDOW_MS) return;
        const mins = Math.max(1, Math.ceil(msUntil / 60000));
        const key = `meeting:${m.id}:${m.scheduled_at}`;
        const label = m.title || 'Meeting';
        notifySoon(
          'Meeting starts soon',
          `${label} starts in ${mins} minute${mins === 1 ? '' : 's'}.`,
          key,
          `${baseUrl}/meetings/${m.id}`
        );
      });

      const bookings = Array.isArray(bookingsData) ? bookingsData : [];
      bookings.forEach((b) => {
        if (b?.status !== 'confirmed') return;
        if (!b?.start_time) return;
        const startTs = new Date(b.start_time).getTime();
        if (Number.isNaN(startTs) || startTs <= now) return;
        const msUntil = startTs - now;
        if (msUntil > REMINDER_WINDOW_MS) return;
        const mins = Math.max(1, Math.ceil(msUntil / 60000));
        const key = `booking:${b.id}:${b.start_time}`;
        notifySoon(
          'Tutoring session starts soon',
          `Your confirmed session starts in ${mins} minute${mins === 1 ? '' : 's'}. Open chat to join call.`,
          key,
          `${baseUrl}/messages`
        );
      });
    } catch {
      // silent: reminders should not disrupt normal app flow
    }
  };

  useEffect(() => {
    if (!socket) return;
    const onNotification = (payload) => {
      const ev = payload?.metadata?.event;
      if (!ev || !DESKTOP_EVENTS.has(ev)) return;
      const title = payload.title || 'GROWE';
      const body = payload.message || '';
      toastRef.current(body, { duration: ev === 'booking_imminent' ? 12000 : 8000 });
      const tag = `${ev}-${payload.id ?? payload.createdAt ?? Date.now()}`;
      tryDesktopNotification(title, body, tag);
    };
    socket.on('notification', onNotification);
    return () => socket.off('notification', onNotification);
  }, [socket]);

  useEffect(() => {
    checkUpcomingSessions();
    const id = window.setInterval(checkUpcomingSessions, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
