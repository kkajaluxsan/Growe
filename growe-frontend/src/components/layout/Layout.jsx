import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '../../context/SocketContext';
import EmailVerificationBanner from '../common/EmailVerificationBanner';
import BookingSessionDesktopAlerts from './BookingSessionDesktopAlerts';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const { connectionState } = useSocket();

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const showBanner = offline || connectionState === 'reconnecting';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      {showBanner && (
        <div className="flex-shrink-0 bg-amber-500 text-amber-900 dark:bg-amber-600 dark:text-amber-100 px-4 py-2 text-center text-sm font-medium z-10">
          {offline ? "You're offline. Some features may be unavailable." : 'Reconnecting…'}
        </div>
      )}
      <EmailVerificationBanner />
      <BookingSessionDesktopAlerts />
      <div className="flex-1 flex min-h-0">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scroll-smooth">
            <div className="mx-auto w-full max-w-7xl min-h-0 p-6 md:p-8 flex flex-col flex-1">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
