import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import api from '../../services/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationLink, setVerificationLink] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
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
      setEmailSent(!!data.emailSent);
      if (data.verificationLink) {
        setVerificationLink(data.verificationLink);
      }
      if (data.user?.isVerified) {
        toast.success('Account created. You can sign in now.');
      } else if (data.emailSent) {
        toast.success('Check your email for a verification link.');
      } else {
        toast.success('Account created. Verify your email before signing in.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      setError(msg);
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
    setResendLoading(true);
    try {
      await requestVerificationEmail(addr);
      toast.success('If your account is waiting for verification, we sent a new link.');
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error(err.response?.data?.error || 'Please wait before requesting another email.');
      } else {
        toast.error(err.response?.data?.error || 'Could not send email.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4">
        <Card className="text-center border-growe/30 bg-growe/5 dark:bg-growe/10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">You&apos;re registered</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">One more step: verify your email to use GROWE.</p>
          {isVerified ? (
            <p className="text-slate-600 dark:text-slate-300">You can sign in now.</p>
          ) : (
            <div className="text-left space-y-5">
              {emailSent && registeredEmail && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 p-4 text-center">
                  <p className="text-slate-800 dark:text-slate-100">
                    We sent a link to <span className="font-semibold break-all">{registeredEmail}</span>.
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Open the email and tap <span className="font-medium">Verify</span> to activate your account.
                  </p>
                </div>
              )}
              {!emailSent && verificationLink && (
                <div className="rounded-2xl border border-growe/30 bg-growe/10 dark:bg-growe/15 p-4 text-center space-y-3">
                  <p className="text-slate-800 dark:text-slate-100 text-sm">
                    We couldn&apos;t send the email automatically. Use this button to verify now:
                  </p>
                  <a
                    href={verificationLink}
                    className="inline-flex items-center justify-center w-full rounded-2xl px-4 py-3 text-sm font-semibold bg-growe text-slate-900 hover:opacity-95 transition-opacity shadow-sm"
                  >
                    Verify my email
                  </a>
                </div>
              )}
              {!emailSent && !verificationLink && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    We couldn&apos;t send the verification email. Use <span className="font-medium">Resend email</span>{' '}
                    below, or ask your administrator to check email settings.
                  </p>
                </div>
              )}
              {emailSent && (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  No message? Check spam and promotions. You can resend or open the help page below.
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
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
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors sm:flex-1 text-center"
                >
                  I need a new link
                </Link>
              </div>
            </div>
          )}
          <Button type="button" className="mt-6 w-full" variant="secondary" onClick={() => navigate('/login')}>
            Continue to sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-6">Register for GROWE</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Role</label>
            <select
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100"
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Applies to both Google sign-up and email registration.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-center text-slate-800 dark:text-slate-100">Sign up with Google</p>
            <div className="flex justify-center">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  text="signup_with"
                  size="large"
                  width="100%"
                  onSuccess={handleGoogleSignUp}
                  onError={() => toast.error('Google sign up failed')}
                />
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Google sign-up is not configured. Set <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span> and restart the
                  frontend.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
            <span className="text-xs text-slate-500 dark:text-slate-400">or register with email</span>
            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
          </div>

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
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-growe/50"
              minLength={8}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-slate-500 mt-1">At least 8 characters</p>
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={loading}>
            Register
          </Button>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-slate-800 dark:text-slate-200 font-medium hover:underline">
              Login
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
