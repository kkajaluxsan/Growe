import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

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
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-6">Reset password</h1>
      <Card>
        {error && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm border border-red-200 dark:border-red-800 mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-growe/50"
              minLength={8}
              required
              autoComplete="new-password"
              disabled={!token}
            />
          </div>
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-growe/50"
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
      </Card>
    </div>
  );
}

