import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({
  children,
  requireVerified = false,
  roles = [],
  /** When true, do not redirect incomplete profiles here (used for /complete-profile). */
  skipProfileComplete = false,
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerified && !user.isVerified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  if (!skipProfileComplete && user.profileCompleted === false) {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }

  if (roles.length > 0) {
    const normalized = String(user.roleName || '').toLowerCase();
    const allowed = roles.map((r) => String(r).toLowerCase());
    if (!allowed.includes(normalized)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
