import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import { SPECIALIZATION_OPTIONS } from '../../constants/specializations';
import {
  normalizeIndexNumber,
  isValidIndexNumber,
  isValidPhone,
  normalizePhoneToE164,
} from '../../utils/academicIdentity';

function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith('http') ? avatarUrl : avatarUrl;
}

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

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [indexNumber, setIndexNumber] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    refreshUser().catch(() => {});
    // Load full profile (GET /auth/me) once — includes academic identity fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setIndexNumber(user.indexNumber || '');
      setAcademicYear(user.academicYear != null ? String(user.academicYear) : '');
      setSemester(user.semester != null ? String(user.semester) : '');
      setSpecialization(user.specialization || '');
    }
  }, [user]);

  const profilePatchValid = useMemo(() => {
    if (indexNumber && !isValidIndexNumber(normalizeIndexNumber(indexNumber))) return false;
    if (phone && String(phone).trim() && !isValidPhone(phone)) return false;
    if (academicYear !== '' && academicYear != null) {
      const ay = parseInt(academicYear, 10);
      if (Number.isNaN(ay) || ay < 1 || ay > 4) return false;
    }
    if (semester !== '' && semester != null) {
      const s = parseInt(semester, 10);
      if (Number.isNaN(s) || (s !== 1 && s !== 2)) return false;
    }
    return true;
  }, [indexNumber, phone, academicYear, semester]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profilePatchValid) {
      toast.error('Fix index number or mobile format before saving.');
      return;
    }
    setSaving(true);
    try {
      const t = phone.trim();
      await api.patch('/auth/me', {
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        indexNumber: normalizeIndexNumber(indexNumber) || null,
        academicYear: academicYear === '' ? null : parseInt(academicYear, 10),
        semester: semester === '' ? null : parseInt(semester, 10),
        specialization: specialization || null,
        phone: t ? normalizePhoneToE164(t) : null,
      });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.error || 'Failed to update profile';
      const details = Array.isArray(d?.details) ? d.details.join('\n') : '';
      toast.error(details ? `${msg}\n${details}` : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image (JPEG, PNG, GIF, or WebP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.user) {
        await refreshUser();
      }
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = avatarPreview || getAvatarUrl(user?.avatarUrl);
  const isTutor = user?.roleName === 'tutor';
  const hasReliability = typeof user?.reliabilityScore === 'number' || user?.reliabilityTotal > 0;

  const yearSemLabel = () => {
    const ay = user?.academicYear;
    const sem = user?.semester;
    if (ay == null || sem == null) return null;
    return `Year ${ay} – Semester ${sem}`;
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Manage your academic identity and account details."
      />

      {user?.indexNumber || user?.specialization || user?.academicYear != null ? (
        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Academic identity</h2>
          <dl className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {user?.indexNumber && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Index</dt>
                <dd className="font-medium">{user.indexNumber}</dd>
              </div>
            )}
            {yearSemLabel() && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Year &amp; semester</dt>
                <dd className="font-medium">{yearSemLabel()}</dd>
              </div>
            )}
            {user?.specialization && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Specialization</dt>
                <dd className="font-medium">{user.specialization}</dd>
              </div>
            )}
            {user?.phone && (
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Mobile</dt>
                <dd className="font-medium">{user.phone}</dd>
              </div>
            )}
          </dl>
        </Card>
      ) : null}

      {hasReliability && (
        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Booking reliability</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Based on {user.reliabilityTotal} completed or no-show session{user.reliabilityTotal !== 1 ? 's' : ''}.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-slate-700 dark:bg-slate-400 rounded-full"
                style={{ width: `${(Number(user.reliabilityScore) || 0) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {(Number(user.reliabilityScore) || 0).toFixed(2)}
            </span>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-28 h-28 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-slate-300 dark:border-slate-600">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-semibold text-slate-500 dark:text-slate-400">
                  {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <label className="cursor-pointer inline-block">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploading}
              />
              <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500 disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Change photo'}
              </span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">JPEG, PNG, GIF or WebP. Max 2 MB.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="flex-1 space-y-4">
            <div>
              <Input
                type="text"
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={255}
              />
            </div>
            <div>
              <Input
                type="email"
                label="Email"
                value={user?.email || ''}
                disabled
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Email cannot be changed.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  type="text"
                  label="Index number"
                  value={indexNumber}
                  onChange={(e) => setIndexNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="IT2023001"
                  inputClassName="font-mono text-sm"
                  maxLength={14}
                />
              </div>
              <div>
                <Input
                  type="tel"
                  label="Mobile"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="+94771234567"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Academic year</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="">—</option>
                  {ACADEMIC_YEARS.map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                >
                  <option value="">—</option>
                  {SEMESTERS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Specialization</label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">—</option>
                {SPECIALIZATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio about you"
                rows={3}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 resize-none"
                maxLength={500}
              />
            </div>
            <Button type="submit" disabled={saving || !profilePatchValid} loading={saving}>
              Save profile
            </Button>
          </form>
        </div>
      </Card>

      {isTutor && (
        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Tutor profile</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Manage your tutor bio, subjects, and availability from the Tutors page.
          </p>
          <Link to="/tutors">
            <Button variant="secondary">Go to Tutor dashboard</Button>
          </Link>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Account</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Role: <span className="font-medium capitalize">{user?.roleName}</span>
          {user?.isVerified && <span className="ml-2 text-emerald-600 dark:text-emerald-400">Verified</span>}
        </p>
      </Card>
    </div>
  );
}
