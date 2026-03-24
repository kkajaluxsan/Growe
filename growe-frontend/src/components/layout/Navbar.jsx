import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold">GROWE</Link>
            <Link to="/groups" className="hover:text-slate-300">Groups</Link>
            <Link to="/assignments" className="hover:text-slate-300">Assignments</Link>
            <Link to="/tutors" className="hover:text-slate-300">Tutors</Link>
            <Link to="/meetings" className="hover:text-slate-300">Meetings</Link>
            {user.roleName === 'admin' && (
              <Link to="/admin" className="hover:text-slate-300">Admin</Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{user.email}</span>
            <span className="text-xs bg-slate-600 px-2 py-1 rounded">{user.roleName}</span>
            <button
              onClick={handleLogout}
              className="text-sm hover:text-slate-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
