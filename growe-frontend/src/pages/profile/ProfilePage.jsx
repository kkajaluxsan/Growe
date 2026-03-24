import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  return avatarUrl.startsWith('http') ? avatarUrl : avatarUrl;
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/me', { displayName: displayName.trim() || null, phone: phone.trim() || null, bio: bio.trim() || null });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
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

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile</h1>

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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                maxLength={255}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"
                maxLength={50}
              />
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
            <Button type="submit" disabled={saving} loading={saving}>
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
