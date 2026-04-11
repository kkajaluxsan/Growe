import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';
import api, { invalidateCsrfToken } from '../../services/api';
import { authLabel, authInput } from '../../components/auth/authFieldStyles';

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
      if (data?.requiresProfileCompletion) {
        navigate('/complete-profile', { replace: true });
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
    <AuthLayout headline="Welcome back">
      <AuthCard>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className={authLabel}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInput}
              required
              autoComplete="email"
              placeholder="you@school.edu"
            />
          </div>

          <div>
            <label htmlFor="login-password" className={authLabel}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInput}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" loading={loading} disabled={loading}>
            Sign in
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-white px-2 text-slate-500 dark:bg-white dark:text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2">
            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <div className="flex w-full justify-center [&>div]:w-full [&_iframe]:!mx-auto">
                <GoogleLogin
                  text="signin_with"
                  width="100%"
                  onSuccess={async (cred) => {
                    try {
                      const { data } = await api.post('/auth/google', { idToken: cred.credential });
                      localStorage.setItem('token', data.token);
                      localStorage.setItem('user', JSON.stringify(data.user));
                      invalidateCsrfToken();
                      window.dispatchEvent(new CustomEvent('auth-refresh', { detail: data.user }));
                      if (data?.requiresProfileCompletion) {
                        navigate('/complete-profile', { replace: true });
                        return;
                      }
                      navigate(from, { replace: true });
                    } catch (err) {
                      toast.error(err.response?.data?.error || 'Google login failed');
                    }
                  }}
                  onError={() => toast.error('Google login failed')}
                />
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Google sign-in is not configured. Set <span className="font-mono text-slate-600 dark:text-slate-300">VITE_GOOGLE_CLIENT_ID</span> and restart the frontend.
              </p>
            )}
          </div>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-growe-dark hover:underline dark:text-slate-400 dark:hover:text-growe"
            >
              Forgot password?
            </Link>
          </div>

          <p className="border-t border-slate-200 pt-5 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-growe-dark underline-offset-4 hover:underline dark:text-growe"
            >
              Create one
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
