import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import NotificationBell from './NotificationBell';
import { getPageTitleFromPath } from '../../constants/navigation';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const title = getPageTitleFromPath(location.pathname);
  const todayLabel = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date());

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-16 px-4 md:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-700 shadow-sm transition-all duration-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-200"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 truncate tracking-tight">
            {title}
          </h1>
          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400">University Learning Workspace</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden md:flex items-center rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50/90 dark:bg-slate-800/80">
          {todayLabel}
        </div>
        <NotificationBell />
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="hidden sm:flex rounded-2xl ring-2 ring-transparent hover:ring-growe/40 transition-all duration-200"
          aria-label="Open profile"
        >
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName}
            email={user?.email}
            size="sm"
          />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
