import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { login, requestVerificationEmail } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const res = err.response?.data;
      const status = err.response?.status;
      if (status === 403 && res?.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
        setError(res.error || 'Please verify your email before signing in.');
        if (res.email) setEmail(res.email);
      } else {
        setError(res?.error || res?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const addr = email.trim();
    if (!addr) {
      toast.error('Enter your email address above first.');
      return;
    }
    setResendLoading(true);
    try {
      await requestVerificationEmail(addr);
      toast.success('If this account is pending verification, we sent a new link. Check your inbox.');
    } catch (err) {
      const res = err.response?.data;
      if (err.response?.status === 429) {
        toast.error(res?.error || 'Too many requests. Try again later.');
      } else {
        toast.error(res?.error || 'Could not send email. Try again later.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-6">Login to GROWE</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className={`p-3 rounded-2xl text-sm ${
                needsVerification
                  ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/25 dark:text-amber-100 border border-amber-200 dark:border-amber-800'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}
              role="alert"
            >
              {error}
            </div>
          )}
          {needsVerification && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Didn&apos;t get the email? We can send another verification link to the address you used at signup.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                loading={resendLoading}
                disabled={resendLoading}
                onClick={handleResend}
              >
                Resend verification email
              </Button>
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
