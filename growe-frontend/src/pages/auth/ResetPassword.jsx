import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { authLabel, authInput } from '../../components/auth/authFieldStyles';

export default function ResetPassword() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Missing reset token. Open the full link from your email.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password reset successful. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      headline="Set a new password"
      subheadline="Use a strong password with at least 8 characters."
    >
      <AuthCard>
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm border border-red-200 dark:border-red-800 mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-password" className={authLabel}>
              New password
            </label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInput}
              minLength={8}
              required
              autoComplete="new-password"
              disabled={!token}
            />
          </div>
          <div>
            <label htmlFor="reset-password-confirm" className={authLabel}>
              Confirm password
            </label>
            <input
              id="reset-password-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authInput}
              minLength={8}
              required
              autoComplete="new-password"
              disabled={!token}
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={loading || !token}>
            Reset password
          </Button>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            <Link to="/login" className="text-slate-800 dark:text-slate-200 font-medium hover:underline">
              Back to login
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

