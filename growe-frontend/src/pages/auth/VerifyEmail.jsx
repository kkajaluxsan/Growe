import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AuthOnboardingSteps from '../../components/auth/AuthOnboardingSteps';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState(() => (emailParam ? emailParam.trim() : ''));
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (emailParam?.trim()) {
      setEmail(emailParam.trim());
    }
  }, [emailParam]);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token was provided. Open the full link from your email, or request a new one below.');
      setCode('TOKEN_MISSING');
      return undefined;
    }

    // React 18 StrictMode runs this effect twice in dev; without abort, the first request
    // verifies and deletes the token and the second shows "invalid or expired".
    const ac = new AbortController();

    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`, { signal: ac.signal })
      .then(async () => {
        setStatus('success');
        setMessage('Your email is verified. You can now log in.');
        if (localStorage.getItem('token')) {
          try {
            await refreshUser();
          } catch {
            /* not logged in or session invalid — user can still use login */
          }
        }
      })
      .catch((err) => {
        if (axios.isCancel(err) || err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
          return;
        }
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
        setCode(err.response?.data?.code || '');
      });

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-verify when token changes; refreshUser is not stable across renders
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) {
      toast.error('Enter your email address.');
      return;
    }
    setResendLoading(true);
    try {
      await api.post('/auth/request-verification-email', { email: addr });
      toast.success('If this account is pending verification, we sent a new link.');
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error(err.response?.data?.error || 'Too many requests. Try again later.');
      } else {
        toast.error(err.response?.data?.error || 'Could not send email.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const isExpired = code === 'TOKEN_INVALID_OR_EXPIRED';

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      {status === 'loading' && (
        <Card className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 border-t-growe mx-auto" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Verifying your email…</p>
        </Card>
      )}
      {status === 'success' && (
        <Card className="text-center py-8 border-growe/40 bg-growe/10 dark:bg-growe/15">
          <div className="mb-5">
            <AuthOnboardingSteps currentStep={2} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Email verified</h2>
          <p className="text-slate-700 dark:text-slate-200">{message}</p>
          <Link to="/login">
            <Button className="mt-6">Go to login</Button>
          </Link>
        </Card>
      )}
      {status === 'error' && (
        <Card className={`text-center py-8 ${isExpired ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
          <div className="mb-5 text-left">
            <AuthOnboardingSteps currentStep={1} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">Verification issue</h2>
          <p className="mb-4 text-slate-700 dark:text-slate-300">{message}</p>
          {isExpired && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Request a new link to your email address below.
            </p>
          )}
          <form onSubmit={handleResend} className="text-left space-y-3 mt-4">
            <Input
              type="email"
              name="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Button type="submit" className="w-full" loading={resendLoading} disabled={resendLoading}>
              Send new verification link
            </Button>
          </form>
          <Button variant="secondary" type="button" className="mt-6" onClick={() => navigate('/login')}>
            Back to login
          </Button>
        </Card>
      )}
    </div>
  );
}
