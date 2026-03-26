import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  if (!user || user.isVerified) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await api.post('/auth/resend-verification');
      toast.success('Verification email sent. Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send verification email');
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshUser();
      toast.success('Account refreshed');
    } catch {
      toast.error('Could not refresh account');
    }
  };

  return (
    <div className="flex-shrink-0 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 px-4 py-3">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold">Email not verified.</span>{' '}
          Verify to unlock groups, messaging, bookings, and meetings.
        </div>
        <div className="flex items-center gap-2">
          <Link to="/verify-email">
            <Button size="sm" variant="secondary">Verify</Button>
          </Link>
          <Button size="sm" variant="secondary" onClick={handleResend} disabled={sending} loading={sending}>
            Resend email
          </Button>
          <Button size="sm" variant="secondary" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}

