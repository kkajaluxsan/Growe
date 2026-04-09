import { useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';

/** Socket `notification` events that should surface as in-app toast + browser Notification (Teams-like). */
const DESKTOP_EVENTS = new Set(['booking_imminent', 'booking_reminder_tutor', 'booking_reminder']);

function tryDesktopNotification(title, body, tag) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag });
    } catch {
      /* ignore */
    }
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((p) => {
      if (p === 'granted') {
        try {
          new Notification(title, { body, tag });
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

  return null;
}
