import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import AuthOnboardingSteps from '../../components/auth/AuthOnboardingSteps';
import Button from '../../components/ui/Button';
import api, { invalidateCsrfToken } from '../../services/api';
import { authLabel, authInput } from '../../components/auth/authFieldStyles';
import { SPECIALIZATION_OPTIONS } from '../../constants/specializations';
import {
  normalizeIndexNumber,
  normalizeNIC,
  isValidIndexNumber,
  isValidNIC,
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

export default function CompleteProfile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [specialization, setSpecialization] = useState('IT');
  const [indexNumber, setIndexNumber] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.profileCompleted) {
      navigate('/', { replace: true });
    }
  }, [user?.profileCompleted, navigate, user]);

  const fieldErrors = useMemo(() => {
    const e = {};
    
    // Role-specific identity field validation
    if (user?.roleName === 'student') {
      if (touched.indexNumber) {
        const idx = normalizeIndexNumber(indexNumber);
        if (!idx) e.indexNumber = 'Index number is required';
        else if (!isValidIndexNumber(idx)) {
          e.indexNumber = 'Index number must start with IT and contain only numbers after';
        }
      }
    } else if (user?.roleName === 'tutor' || user?.roleName === 'admin') {
      if (touched.nicNumber) {
        const nic = normalizeNIC(nicNumber);
        if (!nic) e.nicNumber = 'NIC is required';
        else if (!isValidNIC(nic)) {
          e.nicNumber = 'NIC must be 9 digits + V (old) or 12 digits (new)';
        }
      }
    }
    
    if (touched.phoneNumber) {
      if (!phoneNumber.trim()) e.phoneNumber = 'Mobile number is required';
      else if (!isValidPhone(phoneNumber)) e.phoneNumber = 'Enter a valid Sri Lankan mobile number';
    }
    return e;
  }, [touched, indexNumber, nicNumber, phoneNumber, user?.roleName]);

  const formValid = useMemo(() => {
    if (!isValidPhone(phoneNumber)) return false;
    
    // Role-specific validation
    if (user?.roleName === 'student') {
      if (!specialization) return false;
      const idx = normalizeIndexNumber(indexNumber);
      if (!isValidIndexNumber(idx)) return false;
    } else if (user?.roleName === 'tutor' || user?.roleName === 'admin') {
      const nic = normalizeNIC(nicNumber);
      if (!isValidNIC(nic)) return false;
    } else {
      return false;
    }
    
    return true;
  }, [indexNumber, nicNumber, phoneNumber, specialization, user?.roleName]);

  const markTouched = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const touchedFields = { phoneNumber: true };
    if (user?.roleName === 'student') {
      touchedFields.indexNumber = true;
    } else if (user?.roleName === 'tutor' || user?.roleName === 'admin') {
      touchedFields.nicNumber = true;
    }
    setTouched(touchedFields);
    setError('');
    if (!formValid) {
      toast.error('Please fix the errors before continuing.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        phoneNumber: normalizePhoneToE164(phoneNumber.trim()),
      };
      
      // Academic fields only for students
      if (user?.roleName === 'student') {
        payload.academicYear = academicYear;
        payload.semester = semester;
        payload.specialization = specialization;
        const idx = normalizeIndexNumber(indexNumber);
        payload.indexNumber = idx;
      } else if (user?.roleName === 'tutor' || user?.roleName === 'admin') {
        const nic = normalizeNIC(nicNumber);
        payload.nicNumber = nic;
      }
      
      await api.post(
        '/auth/complete-profile',
        payload,
        { skipGlobalErrorToast: true }
      );
      const fresh = await refreshUser();
      invalidateCsrfToken();
      window.dispatchEvent(new CustomEvent('auth-refresh', { detail: fresh }));
      toast.success('Profile complete. Welcome to GROWE!');
      navigate('/', { replace: true });
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.error || 'Could not save profile';
      const detailsArr = Array.isArray(d?.details) ? d.details : [];
      setError(detailsArr.length ? `${msg}\n${detailsArr.join('\n')}` : msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectClass = `${authInput} cursor-pointer`;
  const displayName = user?.displayName || '';
  const email = user?.email || '';

  return (
    <AuthLayout
      headline="Complete your academic profile"
      subheadline="Required for GROWE — same standards as email registration."
    >
      <AuthCard className="max-w-lg">
        <div className="mb-5">
          <AuthOnboardingSteps currentStep={2} />
        </div>
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          {error && (
            <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/50 p-5 dark:border-slate-600 dark:bg-slate-900/30">
            <SectionTitle>Account</SectionTitle>
            <div>
              <label className={authLabel}>Name</label>
              <input
                type="text"
                value={displayName}
                disabled
                className={`${authInput} cursor-not-allowed opacity-90`}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">From your Google account.</p>
            </div>
            <div>
              <label className={authLabel}>Email</label>
              <input
                type="email"
                value={email}
                disabled
                className={`${authInput} cursor-not-allowed opacity-90`}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cannot be changed.</p>
            </div>
          </div>

          {user?.roleName === 'student' && (
            <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/50 p-5 dark:border-slate-600 dark:bg-slate-900/30">
              <SectionTitle>Academic information</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cp-year" className={authLabel}>
                    Academic year
                  </label>
                  <select
                    id="cp-year"
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
                  <label htmlFor="cp-semester" className={authLabel}>
                    Semester
                  </label>
                  <select
                    id="cp-semester"
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
                <label htmlFor="cp-spec" className={authLabel}>
                  Specialization
                </label>
                <select
                  id="cp-spec"
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
          )}

          <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/50 p-5 dark:border-slate-600 dark:bg-slate-900/30">
            <SectionTitle>Identity</SectionTitle>
            
            {user?.roleName === 'student' ? (
              <div>
                <label htmlFor="cp-index" className={authLabel}>
                  Index number
                </label>
                <input
                  id="cp-index"
                  type="text"
                  value={indexNumber}
                  onChange={(e) => setIndexNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
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
            ) : user?.roleName === 'tutor' || user?.roleName === 'admin' ? (
              <div>
                <label htmlFor="cp-nic" className={authLabel}>
                  NIC number
                </label>
                <input
                  id="cp-nic"
                  type="text"
                  value={nicNumber}
                  onChange={(e) => setNicNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onBlur={() => markTouched('nicNumber')}
                  className={authInput}
                  autoComplete="off"
                  placeholder="123456789V or 123456789012"
                  maxLength={12}
                />
                {fieldErrors.nicNumber && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.nicNumber}</p>
                )}
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Old: 9 digits + V (e.g., 123456789V) | New: 12 digits (e.g., 123456789012)
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-200">
                Loading role information...
              </div>
            )}
            
            <div>
              <label htmlFor="cp-phone" className={authLabel}>
                Mobile number (Sri Lanka)
              </label>
              <input
                id="cp-phone"
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
            Save and continue
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
