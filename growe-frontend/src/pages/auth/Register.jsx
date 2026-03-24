import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationLink, setVerificationLink] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const { register } = useAuth();
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
      if (data.verificationLink) {
        setVerificationLink(data.verificationLink);
      }
      if (data.user?.isVerified) {
        toast.success('Account created. You can sign in now.');
      } else {
        toast.success('Check your email to verify your account before signing in.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4">
        <Card className="text-center border-growe/30 bg-growe/5 dark:bg-growe/10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Registration successful</h2>
          {isVerified ? (
            <p className="text-slate-600 dark:text-slate-300">You can log in now.</p>
          ) : (
            <>
              <p className="text-slate-700 dark:text-slate-200">
                Check your email to verify your account. You must verify before you can sign in.
              </p>
              {verificationLink && (
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Dev / no SMTP?</span>{' '}
                  <a href={verificationLink} className="text-growe font-medium underline break-all">
                    Open verification link
                  </a>
                </p>
              )}
            </>
          )}
          <Button type="button" className="mt-6" onClick={() => navigate('/login')}>
            Go to login
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
