export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true, roles: ['student', 'tutor', 'admin'] },
  { to: '/groups', label: 'Groups', roles: ['student', 'tutor'] },
  { to: '/messages', label: 'Messages', roles: ['student', 'tutor', 'admin'] },
  { to: '/ai-assistant', label: 'AI Assistant', roles: ['student', 'tutor', 'admin'] },
  { to: '/tutors', label: 'Bookings', roles: ['student', 'tutor'] },
  { to: '/my-availability', label: 'My Availability', roles: ['tutor'] },
  { to: '/meetings', label: 'Meetings', roles: ['student', 'tutor'] },
  { to: '/assignments', label: 'Assignments', roles: ['student', 'tutor', 'admin'] },
  { to: '/admin', label: 'Admin', roles: ['admin'] },
  { to: '/profile', label: 'Profile', end: true, roles: ['student', 'tutor', 'admin'] },
];

export function getNavItemsForRole(roleName) {
  const role = roleName || 'student';
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

const exactTitles = {
  '/': 'Dashboard',
  '/groups': 'Groups',
  '/groups/new': 'Create group',
  '/groups/join': 'Join group',
  '/messages': 'Messages',
  '/ai-assistant': 'AI Assistant',
  '/assignments': 'Assignments',
  '/assignments/new': 'New assignment',
  '/tutors': 'Bookings',
  '/my-availability': 'My Availability',
  '/meetings': 'Meetings',
  '/profile': 'Profile',
  '/admin': 'Admin',
};

export function getPageTitleFromPath(pathname) {
  const p = pathname.replace(/\/$/, '') || '/';
  if (exactTitles[p]) return exactTitles[p];
  if (p.startsWith('/groups/')) return 'Study group';
  if (p.startsWith('/assignments/')) return 'Assignment';
  if (p.startsWith('/meetings/')) return 'Meeting';
  return 'GROWE';
}
