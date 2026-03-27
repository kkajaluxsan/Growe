import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import NotificationBell from './NotificationBell';

function getPageTitle(pathname) {
  const p = pathname.replace(/\/$/, '') || '/';
  const exact = {
    '/': 'Dashboard',
    '/groups': 'Groups',
    '/groups/new': 'Create group',
    '/messages': 'Messages',
    '/ai-assistant': 'AI Assistant',
    '/assignments': 'Assignments',
    '/assignments/new': 'New assignment',
    '/tutors': 'Bookings',
    '/meetings': 'Planner',
    '/profile': 'Profile',
    '/admin': 'Admin',
  };
  if (exact[p]) return exact[p];
  if (p.startsWith('/groups/')) return 'Study group';
  if (p.startsWith('/assignments/')) return 'Assignment';
  if (p.startsWith('/meetings/')) return 'Meeting';
  return 'GROWE';
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-14 px-4 md:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700 shadow-sm transition-all duration-200">
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
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
          className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
