import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';
import api, { invalidateCsrfToken } from '../../services/api';
import { authLabel, authInput } from '../../components/auth/authFieldStyles';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState('');
  const { register, requestVerificationEmail } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(email, password, roleName);
      setSuccess(true);
      setIsVerified(data.user?.isVerified ?? false);
      setRegisteredEmail(data.user?.email || email.trim().toLowerCase());
      if (data.user?.isVerified) {
        toast.success('Account created. You can sign in now.');
      } else {
        toast.success('Check your email for a verification link.');
      }
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.error || 'Registration failed';
      const detail = typeof d?.details === 'string' ? d.details.trim() : '';
      setError(detail ? `${msg}\n\n${detail}` : msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async (cred) => {
    try {
      const { data } = await api.post('/auth/google', { idToken: cred.credential, roleName });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      invalidateCsrfToken();
      window.dispatchEvent(new CustomEvent('auth-refresh', { detail: data.user }));
      toast.success('Welcome to GROWE!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Google sign up failed');
    }
  };

  const handleResendVerification = async () => {
    const addr = registeredEmail.trim();
    if (!addr) return;
    setResendError('');
    setResendLoading(true);
    try {
      await requestVerificationEmail(addr);
      toast.success('If your account is waiting for verification, we sent a new link.');
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.error || 'Could not send email.';
      if (err.response?.status === 429) {
        setResendError('');
        toast.error(msg);
      } else {
        const detail = typeof d?.details === 'string' ? d.details.trim() : '';
        setResendError(detail ? `${msg}\n\n${detail}` : msg);
        toast.error(msg);
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        headline="You're registered"
        subheadline="One more step — verify your email to unlock the full GROWE experience."
      >
        <AuthCard className="text-center">
          {isVerified ? (
            <p className="text-slate-700 dark:text-slate-200">You can sign in now.</p>
          ) : (
            <div className="space-y-5 text-left">
              {resendError && (
                <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
                  {resendError}
                </div>
              )}
              {registeredEmail && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/60">
                  <p className="text-center text-slate-800 dark:text-slate-100">
                    We sent a link to <span className="font-semibold break-all">{registeredEmail}</span>.
                  </p>
                  <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                    Open the email and tap <span className="font-medium">Verify</span> to activate your account.
                  </p>
                </div>
              )}
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                No message? Check spam and promotions. You can resend or open the help page below.
              </p>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:flex-1"
                  loading={resendLoading}
                  disabled={resendLoading || !registeredEmail}
                  onClick={handleResendVerification}
                >
                  Resend email
                </Button>
                <Link
                  to={registeredEmail ? `/verify-email?email=${encodeURIComponent(registeredEmail)}` : '/verify-email'}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  I need a new link
                </Link>
              </div>
            </div>
          )}
          <Button type="button" className="mt-6 w-full" variant="secondary" onClick={() => navigate('/login')}>
            Continue to sign in
          </Button>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      headline="Create your account"
      subheadline="Join students and tutors — collaborate, study, and stay on track."
    >
      <AuthCard>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="register-role" className={authLabel}>
              I am a
            </label>
            <select
              id="register-role"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className={authInput}
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Used for Google sign-up and email registration.</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-600 dark:bg-slate-800/50">
            <p className="mb-3 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">Sign up with Google</p>
            <div className="flex justify-center [&>div]:w-full [&_iframe]:!mx-auto">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  text="signup_with"
                  size="large"
                  width="100%"
                  onSuccess={handleGoogleSignUp}
                  onError={() => toast.error('Google sign up failed')}
                />
              ) : (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Set <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span> and restart the frontend.
                </p>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-white px-2 text-slate-500 dark:bg-white dark:text-slate-500">Or use email</span>
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className={authLabel}>
              Email
            </label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className={authLabel}>
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInput}
              minLength={8}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Minimum 8 characters.</p>
          </div>

          <Button type="submit" className="w-full" loading={loading} disabled={loading}>
            Create account
          </Button>

          <p className="border-t border-slate-200 pt-5 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-growe-dark underline-offset-4 hover:underline dark:text-growe"
            >
              Sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
