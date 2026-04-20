import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';
import api, { invalidateCsrfToken } from '../../services/api';
import { authLabel, authInput } from '../../components/auth/authFieldStyles';
import { SPECIALIZATION_OPTIONS } from '../../constants/specializations';
import {
  normalizeIndexNumber,
  isValidIndexNumber,
  isValidPhone,
  normalizePhoneToE164,
} from '../../utils/academicIdentity';

const ACADEMIC_YEARS = [
  { value: 1, label: 'Year 1' },
  { value: 2, label: 'Year 2' },
  { value: 3, label: 'Year 3' },
  { value: 4, label: 'Year 4' },
];

const SEMESTERS = [
  { value: 1, label: 'Semester 1' },
  { value: 2, label: 'Semester 2' },
];

function SectionTitle({ children }) {
  return (
    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-600 pb-2">
      {children}
    </h2>
  );
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('student');
  const [academicYear, setAcademicYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [specialization, setSpecialization] = useState(SPECIALIZATION_OPTIONS[0]?.value || 'IT');
  const [indexNumber, setIndexNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [touched, setTouched] = useState({});
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

  const fieldErrors = useMemo(() => {
    const e = {};
    if (touched.name && !name.trim()) e.name = 'Name is required';
    if (touched.email) {
      if (!email.trim()) e.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Invalid email format';
    }
    if (touched.password) {
      if (!password) e.password = 'Password is required';
      else if (password.length < 8) e.password = 'At least 8 characters';
    }
    if (touched.indexNumber) {
      const idx = normalizeIndexNumber(indexNumber);
      if (!idx) e.indexNumber = 'Index number is required';
      else if (!isValidIndexNumber(idx)) {
        e.indexNumber = 'Index number must start with IT and contain only numbers after';
      }
    }
    if (touched.phoneNumber) {
      if (!phoneNumber.trim()) e.phoneNumber = 'Mobile number is required';
      else if (!isValidPhone(phoneNumber)) e.phoneNumber = 'Enter a valid Sri Lankan mobile number';
    }
    return e;
  }, [touched, name, email, password, indexNumber, phoneNumber]);

  const formValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return false;
    if (!password || password.length < 8) return false;
    const idx = normalizeIndexNumber(indexNumber);
    if (!isValidIndexNumber(idx)) return false;
    if (!isValidPhone(phoneNumber)) return false;
    if (!specialization) return false;
    return true;
  }, [name, email, password, indexNumber, phoneNumber, specialization]);

  const markTouched = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      indexNumber: true,
      phoneNumber: true,
    });
    setError('');
    if (!formValid) {
      toast.error('Please fix the errors before continuing.');
      return;
    }
    setLoading(true);
    const idx = normalizeIndexNumber(indexNumber);
    const payload = {
      email: email.trim().toLowerCase(),
      password,
      roleName,
      name: name.trim(),
      academicYear,
      semester,
      specialization,
      indexNumber: idx,
      phoneNumber: normalizePhoneToE164(phoneNumber.trim()),
    };
    try {
      const data = await register(payload);
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
      const detailsArr = Array.isArray(d?.details) ? d.details : [];
      const combined =
        detailsArr.length > 0 ? `${msg}\n\n${detailsArr.join('\n')}` : detail ? `${msg}\n\n${detail}` : msg;
      setError(combined);
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
      if (data?.requiresProfileCompletion) {
        navigate('/complete-profile', { replace: true });
        return;
      }
      toast.success('Welcome to GROWE!');
      navigate('/', { replace: true });
    } catch (err) {
      if (!err?.response) {
        toast.error('Cannot reach server. Start backend API and try again.');
      } else {
        toast.error(err.response?.data?.error || 'Google sign up failed');
      }
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

  const selectClass = `${authInput} cursor-pointer`;

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
      subheadline="University-grade identity — collaborate with peers in your programme."
    >
      <AuthCard className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
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
              className={selectClass}
            >
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Used for Google sign-up and email registration.
            </p>
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
                  onError={() => toast.error('Google sign-up popup failed. Check browser popup/cookie settings and Google OAuth origin config.')}
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
              <span className="bg-white px-2 text-slate-500 dark:bg-white dark:text-slate-500">Or register with email</span>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/50 p-5 dark:border-slate-600 dark:bg-slate-900/30">
            <SectionTitle>Basic information</SectionTitle>
            <div>
              <label htmlFor="register-name" className={authLabel}>
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => markTouched('name')}
                className={authInput}
                autoComplete="name"
                placeholder="Your name"
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>}
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
                onBlur={() => markTouched('email')}
                className={authInput}
                autoComplete="email"
                placeholder="you@school.edu"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>}
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
                onBlur={() => markTouched('password')}
                className={authInput}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
              )}
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Minimum 8 characters.</p>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/50 p-5 dark:border-slate-600 dark:bg-slate-900/30">
            <SectionTitle>Academic information</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="register-year" className={authLabel}>
                  Academic year
                </label>
                <select
                  id="register-year"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(Number(e.target.value))}
                  className={selectClass}
                >
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="register-semester" className={authLabel}>
                  Semester
                </label>
                <select
                  id="register-semester"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className={selectClass}
                >
                  {SEMESTERS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="register-spec" className={authLabel}>
                Specialization
              </label>
              <select
                id="register-spec"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className={selectClass}
              >
                {SPECIALIZATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/50 p-5 dark:border-slate-600 dark:bg-slate-900/30">
            <SectionTitle>Identity</SectionTitle>
            <div>
              <label htmlFor="register-index" className={authLabel}>
                Index number
              </label>
              <input
                id="register-index"
                type="text"
                value={indexNumber}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setIndexNumber(v);
                }}
                onBlur={() => markTouched('indexNumber')}
                className={authInput}
                autoComplete="off"
                placeholder="IT2023001"
                maxLength={14}
              />
              {fieldErrors.indexNumber && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.indexNumber}</p>
              )}
            </div>
            <div>
              <label htmlFor="register-phone" className={authLabel}>
                Mobile number (Sri Lanka)
              </label>
              <input
                id="register-phone"
                type="tel"
                inputMode="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))}
                onBlur={() => markTouched('phoneNumber')}
                className={authInput}
                autoComplete="tel"
                placeholder="0771234567"
              />
              {fieldErrors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.phoneNumber}</p>
              )}
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Use 07…, 94…, or +94… — stored as +94 7X XXX XXXX.
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" loading={loading} disabled={loading || !formValid}>
            Create account
          </Button>

          <p className="border-t border-slate-200 pt-5 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-growe-dark underline-offset-4 hover:underline dark:text-growe/90"
            >
              Sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
