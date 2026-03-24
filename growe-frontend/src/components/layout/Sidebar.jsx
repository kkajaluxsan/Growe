import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/groups', label: 'Groups' },
  { to: '/messages', label: 'Messages' },
  { to: '/ai-assistant', label: 'AI Assistant' },
  { to: '/tutors', label: 'Bookings' },
  { to: '/meetings', label: 'Planner' },
  { to: '/assignments', label: 'Assignments' },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const location = useLocation();

  const linkClass = (path, end) => {
    const isActive = end
      ? location.pathname === path
      : path === '/'
        ? location.pathname === '/'
        : location.pathname === path || location.pathname.startsWith(`${path}/`);
    return `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-growe/15 text-slate-900 shadow-sm dark:bg-growe/20 dark:text-slate-100'
        : 'text-slate-600 hover:bg-growe/10 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-growe/10 dark:hover:text-slate-100'
    }`;
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-md transform transition-transform duration-200 ease-out lg:translate-x-0 lg:static lg:z-auto lg:h-full lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200 dark:border-slate-700">
            <Link
              to="/"
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
              onClick={() => onClose?.()}
            >
              <span className="text-growe-dark">GRO</span>WE
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all duration-200"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(({ to, label, end }) => (
              <Link key={to} to={to} className={linkClass(to, end)} onClick={() => onClose?.()}>
                {label}
              </Link>
            ))}
            {user?.roleName === 'admin' && (
              <Link to="/admin" className={linkClass('/admin')} onClick={() => onClose?.()}>
                Admin
              </Link>
            )}
            <Link to="/profile" className={linkClass('/profile', true)} onClick={() => onClose?.()}>
              Profile
            </Link>
          </nav>
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all duration-200"
              onClick={() => onClose?.()}
            >
              <Avatar
                src={user?.avatarUrl}
                name={user?.displayName}
                email={user?.email}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.displayName || user?.email}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</span>
              </div>
            </Link>
            <div className="flex flex-wrap gap-1.5 px-1">
              <Badge variant="default">{user?.roleName}</Badge>
              {user?.isVerified && <Badge variant="success">Verified</Badge>}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all duration-200"
            >
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
