import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('If an account exists, we sent a reset link.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset email');
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
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-growe/50"
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading} disabled={loading}>
              Send reset link
            </Button>
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

