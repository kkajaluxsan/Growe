import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { authLabel, authInput } from '../../components/auth/authFieldStyles';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email }, { skipGlobalErrorToast: true });
      setSent(true);
      toast.success('If an account exists, we sent a reset link.');
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.error || d?.message || 'Failed to send reset email';
      const detail = typeof d?.details === 'string' ? d.details.trim() : '';
      setError(detail ? `${msg}\n\n${detail}` : msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-6">Forgot password</h1>
      <Card>
        {sent ? (
          <div className="space-y-3 text-center">
            <p className="text-slate-700 dark:text-slate-300">
              If an account exists for <span className="font-medium">{email}</span>, a reset link was sent.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="w-full mt-2">Back to login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="forgot-email" className={authLabel}>
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInput}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading} disabled={loading}>
              Send reset link
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              If you registered with Google, use <span className="font-medium">Sign in with Google</span> on the login page
              instead of a password reset.
            </p>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Remembered it?{' '}
              <Link to="/login" className="text-slate-800 dark:text-slate-200 font-medium hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
