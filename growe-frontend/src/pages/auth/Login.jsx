import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import api from '../../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data?.user && data.user.isVerified === false) {
        toast.error(data?.message || 'Please verify your email to unlock all features');
        navigate('/verify-email', { replace: true });
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      const res = err.response?.data;
      setError(res?.error || res?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-6">Login to GROWE</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="p-3 rounded-2xl text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-growe/50 focus:border-growe transition-all duration-200"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-growe/50 focus:border-growe transition-all duration-200"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={loading}>
            Login
          </Button>
          <div className="flex justify-center">
            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <GoogleLogin
                text="signin_with"
                onSuccess={async (cred) => {
                  try {
                    const { data } = await api.post('/auth/google', { idToken: cred.credential });
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.dispatchEvent(new CustomEvent('auth-refresh', { detail: data.user }));
                    navigate(from, { replace: true });
                  } catch (err) {
                    toast.error(err.response?.data?.error || 'Google login failed');
                  }
                }}
                onError={() => toast.error('Google login failed')}
              />
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Google sign-in is not configured. Set <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span> and restart the frontend.
              </p>
            )}
          </div>
          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
              Forgot password?
            </Link>
          </div>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-slate-800 dark:text-slate-200 font-medium hover:underline">
              Register
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
