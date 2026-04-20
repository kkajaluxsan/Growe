import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { localDateInputMin } from '../../utils/dateInput';
import TutorRequestPanel from '../../components/bookings/TutorRequestPanel';
import GroupTutorInvitePanel from '../../components/bookings/GroupTutorInvitePanel';
import TutorBookingCalendar from '../../components/bookings/TutorBookingCalendar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';

export default function TutorDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { socket } = useSocket();
  const [profile, setProfile] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'bookings' || tab === 'schedule') {
      setActiveTab(tab);
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      loadAvailability();
      loadBookings();
    }
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'schedule' && profile) {
      loadBookings();
    }
  }, [activeTab, profile]);

  const loadProfile = () => {
    setLoading(true);
    api.get('/tutors/profile')
      .then(({ data }) => setProfile(data))
      .catch(() => {
        setProfile(null);
      })
      .finally(() => setLoading(false));
  };

  const loadAvailability = () => {
    api.get('/tutors/availability')
      .then(({ data }) => setAvailability(data))
      .catch(() => {
        setAvailability([]);
      });
  };

  const loadBookings = useCallback((isSilent = false) => {
    api.get('/bookings')
      .then(({ data }) => setBookings(data))
      .catch(() => {
        setBookings([]);
      });
  }, []);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      // Refresh bookings if a relevant event occurs
      if (['booking', 'groupTutorInvite'].includes(notif.type)) {
        loadBookings(true);
      }
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, loadBookings]);

  if (loading) {
    return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-growe-dark" />;
  }

  const tabButtonClass = (active) =>
    `rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'bg-growe text-slate-900 shadow-sm'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
    }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutor Dashboard"
        subtitle="Manage your profile, availability, session schedule, bookings, and student feedback."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={tabButtonClass(activeTab === 'profile')}
        >
          My Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={tabButtonClass(activeTab === 'availability')}
        >
          My Availability
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={tabButtonClass(activeTab === 'schedule')}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={tabButtonClass(activeTab === 'bookings')}
        >
          My Bookings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ratings')}
          className={tabButtonClass(activeTab === 'ratings')}
        >
          My Ratings
        </button>
      </div>

      {activeTab === 'profile' && (
        <TutorProfileSection profile={profile} onSaved={loadProfile} />
      )}
      {activeTab === 'availability' && (
        <TutorAvailabilitySection availability={availability} onUpdate={loadAvailability} />
      )}
      {activeTab === 'schedule' && <TutorBookingCalendar bookings={bookings} />}
      {activeTab === 'bookings' && (
        <TutorBookingsSection
          bookings={bookings}
          onUpdate={loadBookings}
          onAfterGroupInviteAccept={() => {
            loadBookings();
            setActiveTab('schedule');
          }}
        />
      )}
      {activeTab === 'ratings' && <TutorRatingsSection />}
    </div>
  );
}

function TutorProfileSection({ profile, onSaved }) {
  const [bio, setBio] = useState(profile?.bio || '');
  const [subjects, setSubjects] = useState(profile?.subjects?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBio(profile?.bio || '');
    setSubjects(profile?.subjects?.join(', ') || '');
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const subjectsArray = subjects.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      if (profile) {
        await api.patch('/tutors/profile', { bio, subjects: subjectsArray });
        alert('Profile updated');
      } else {
        await api.post('/tutors/profile', { bio, subjects: subjectsArray });
        alert('Profile created');
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">Tutor Profile</h2>
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border rounded py-2 px-3"
            rows={4}
            placeholder="Tell students about your teaching experience..."
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Subjects (comma-separated)</label>
          <input
            type="text"
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            className="w-full border rounded py-2 px-3"
            placeholder="e.g. Math, Physics, Chemistry"
          />
        </div>
        <Button type="submit" disabled={saving} loading={saving}>
          {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
        </Button>
      </form>
    </Card>
  );
}

function TutorAvailabilitySection({ availability, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [availableDate, setAvailableDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [durationMode, setDurationMode] = useState('preset');
  const [presetDuration, setPresetDuration] = useState(60);
  const [maxStudentsPerSlot, setMaxStudentsPerSlot] = useState(1);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState({
    availableDate: '',
    startTime: '09:00',
    endTime: '17:00',
    durationMode: 'preset',
    presetDuration: 60,
    sessionDuration: 60,
    maxStudentsPerSlot: 1,
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      await api.post('/tutors/availability', {
        availableDate,
        startTime: startTime + ':00',
        endTime: endTime + ':00',
        sessionDuration: durationMode === 'custom' ? sessionDuration : presetDuration,
        maxStudentsPerSlot,
      });
      setAvailableDate('');
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Failed');
    } finally {
      setAdding(false);
    }
  };

  const beginEdit = (slot) => {
    const currentDuration = Number(slot.session_duration) || 60;
    const preset = [30, 45, 60, 90].includes(currentDuration) ? currentDuration : 60;
    const mode = [30, 45, 60, 90].includes(currentDuration) ? 'preset' : 'custom';
    setEditingId(String(slot.id));
    setEditForm({
      availableDate: slot.available_date,
      startTime: slot.start_time?.slice(0, 5) || '09:00',
      endTime: slot.end_time?.slice(0, 5) || '17:00',
      durationMode: mode,
      presetDuration: preset,
      sessionDuration: currentDuration,
      maxStudentsPerSlot: Number(slot.max_students_per_slot) || 1,
    });
  };

  const saveEdit = async (id) => {
    try {
      await api.patch(`/tutors/availability/${id}`, {
        availableDate: editForm.availableDate,
        startTime: `${editForm.startTime}:00`,
        endTime: `${editForm.endTime}:00`,
        sessionDuration:
          editForm.durationMode === 'custom'
            ? Number(editForm.sessionDuration)
            : Number(editForm.presetDuration),
        maxStudentsPerSlot: Number(editForm.maxStudentsPerSlot) || 1,
      });
      setEditingId('');
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.details?.[0] || 'Failed to update availability');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this availability slot?')) return;
    try {
      await api.delete(`/tutors/availability/${id}`);
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-xl">
        <h2 className="text-lg font-semibold mb-4">Add Availability</h2>
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={availableDate}
              onChange={(e) => setAvailableDate(e.target.value)}
              min={localDateInputMin()}
              className="border rounded py-2 px-3"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border rounded py-2 px-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border rounded py-2 px-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duration (min)</label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {[30, 45, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDurationMode('preset');
                      setPresetDuration(d);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${durationMode === 'preset' && presetDuration === d ? 'bg-growe border-growe-dark text-slate-900' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}
                  >
                    {d === 60 ? '1 hour' : `${d} min`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDurationMode('custom')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${durationMode === 'custom' ? 'bg-growe border-growe-dark text-slate-900' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'}`}
                >
                  Custom
                </button>
              </div>
              {durationMode === 'custom' && (
                <input
                  type="number"
                  min={15}
                  max={480}
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value, 10) || 15)}
                  className="border rounded py-2 px-3 w-24"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max per slot</label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxStudentsPerSlot}
              onChange={(e) => setMaxStudentsPerSlot(parseInt(e.target.value, 10))}
              className="border rounded py-2 px-3 w-20"
            />
          </div>
          <Button type="submit" disabled={adding} loading={adding}>
            {adding ? 'Adding...' : 'Add'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Your Availability Slots</h2>
        {availability.length === 0 ? (
          <p className="text-gray-600">No availability added yet. Add slots above.</p>
        ) : (
          <ul className="space-y-2">
            {availability.map((a) => (
              <li key={a.id} className="py-2 border-b">
                {editingId === String(a.id) ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      <input type="date" value={editForm.availableDate} min={localDateInputMin()} onChange={(e) => setEditForm((p) => ({ ...p, availableDate: e.target.value }))} className="border rounded py-2 px-3" />
                      <input type="time" value={editForm.startTime} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} className="border rounded py-2 px-3" />
                      <input type="time" value={editForm.endTime} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} className="border rounded py-2 px-3" />
                      <input type="number" min={15} max={480} value={editForm.durationMode === 'custom' ? editForm.sessionDuration : editForm.presetDuration} onChange={(e) => {
                        const n = parseInt(e.target.value, 10) || 15;
                        setEditForm((p) => p.durationMode === 'custom' ? { ...p, sessionDuration: n } : { ...p, presetDuration: n });
                      }} className="border rounded py-2 px-3" />
                      <input type="number" min={1} max={20} value={editForm.maxStudentsPerSlot} onChange={(e) => setEditForm((p) => ({ ...p, maxStudentsPerSlot: parseInt(e.target.value, 10) || 1 }))} className="border rounded py-2 px-3" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => saveEdit(a.id)}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId('')}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center gap-2">
                    <span>{a.available_date} {a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)} ({a.session_duration} min)</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => beginEdit(a)} className="text-blue-600 hover:underline text-sm">Edit</button>
                      <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:underline text-sm">Remove</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TutorBookingsSection({ bookings, onUpdate, onAfterGroupInviteAccept }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState('');
  const [groupInvites, setGroupInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [actingInviteId, setActingInviteId] = useState(null);

  const hasStarted = (b) => new Date(b.start_time).getTime() <= Date.now();
  const isSessionLive = (b) => {
    const now = Date.now();
    const start = new Date(b.start_time).getTime();
    const end = new Date(b.end_time).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return now >= start && now <= end;
  };

  const loadGroupInvites = useCallback(() => {
    setInvitesLoading(true);
    api
      .get('/tutors/group-invites', { skipGlobalErrorToast: true })
      .then(({ data }) => setGroupInvites(Array.isArray(data) ? data : []))
      .catch(() => setGroupInvites([]))
      .finally(() => setInvitesLoading(false));
  }, []);

  useEffect(() => {
    loadGroupInvites();
  }, [loadGroupInvites]);

  const handleStatus = async (bookingId, status) => {
    try {
      setBusyId(bookingId);
      await api.patch(`/bookings/${bookingId}/status`, { status });
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setBusyId('');
    }
  };

  const handleAcceptGroupInvite = (inv) => {
    setActingInviteId(inv.id);
    api
      .post(`/groups/${inv.group_id}/tutor-invites/${inv.id}/accept`)
      .then(() => {
        toast.success('Session accepted. It’s on your Calendar and in My Bookings. Open the meeting when it’s time.');
        loadGroupInvites();
        onUpdate();
        onAfterGroupInviteAccept?.();
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not accept'))
      .finally(() => setActingInviteId(null));
  };

  const handleDeclineGroupInvite = (inv) => {
    setActingInviteId(inv.id);
    api
      .post(`/groups/${inv.group_id}/tutor-invites/${inv.id}/reject`)
      .then(() => {
        toast.success('Request declined');
        loadGroupInvites();
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Could not decline'))
      .finally(() => setActingInviteId(null));
  };

  const openSessionChat = async (booking) => {
    const otherUserId = booking?.student_id;
    if (!otherUserId) {
      toast.error('Student info is missing for this booking.');
      return;
    }
    try {
      const { data } = await api.post(`/conversations/direct/${otherUserId}`);
      navigate('/messages', {
        state: {
          conversation: data,
          callSession: {
            conversationId: data.id,
            bookingId: booking.id,
            callerRole: 'tutor',
          },
        },
      });
      toast.success('Session chat opened. Use voice/video buttons to start the meeting.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not open session chat');
    }
  };

  return (
    <div className="space-y-6">
      <GroupTutorInvitePanel
        invites={groupInvites}
        loading={invitesLoading}
        actingId={actingInviteId}
        onAccept={handleAcceptGroupInvite}
        onDecline={handleDeclineGroupInvite}
      />

      <TutorRequestPanel
        bookings={bookings}
        busyId={busyId}
        onAccept={(b) => handleStatus(b.id, 'confirmed')}
        onDecline={(b) => handleStatus(b.id, 'cancelled')}
      />

      <Card className="overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">My Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-600 dark:text-slate-400">No booking rows yet. Group tutor requests above become bookings after you accept.</p>
        ) : (
      <table className="min-w-full">
        <thead>
          <tr className="border-b text-left">
            <th className="px-4 py-2">Student</th>
            <th className="px-4 py-2">Time</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="px-4 py-2">{b.student_email}</td>
              <td className="px-4 py-2">{new Date(b.start_time).toLocaleString()}</td>
              <td className="px-4 py-2 capitalize">{b.status}</td>
              <td className="px-4 py-2">
                {['pending', 'waiting_tutor_confirmation'].includes(b.status) && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="success" onClick={() => handleStatus(b.id, 'confirmed')}>Confirm</Button>
                    <Button size="sm" variant="danger" onClick={() => handleStatus(b.id, 'cancelled')}>Decline</Button>
                  </div>
                )}
                {b.status === 'confirmed' && (
                  <div className="flex flex-wrap gap-2">
                    {isSessionLive(b) && (
                      <Button size="sm" variant="secondary" onClick={() => openSessionChat(b)}>Start Session</Button>
                    )}
                    {hasStarted(b) && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="success" onClick={() => handleStatus(b.id, 'completed')}>Complete</Button>
                        <Button size="sm" variant="warning" onClick={() => handleStatus(b.id, 'no_show')}>No-Show</Button>
                      </div>
                    )}
                    <Button size="sm" variant="danger" onClick={() => handleStatus(b.id, 'cancelled')}>Cancel</Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        )}
      </Card>
    </div>
  );
}

function TutorRatingsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tutors/my-ratings', { skipGlobalErrorToast: true })
      .then(({ data }) => setData(data))
      .catch(() => setData({ average: 0, count: 0, reviews: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-growe-dark" />;
  }

  const { average = 0, count = 0, reviews = [] } = data || {};
  const roundedAvg = Math.round(average);

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <Card>
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Rating Summary</h2>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-slate-900 dark:text-slate-100">
              {count > 0 ? average.toFixed(1) : '—'}
            </div>
            <div className="text-amber-500 text-2xl mt-1">
              {'★'.repeat(roundedAvg)}
              <span className="text-slate-300 dark:text-slate-600">{'★'.repeat(Math.max(0, 5 - roundedAvg))}</span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {count} {count === 1 ? 'review' : 'reviews'}
            </div>
          </div>
          {count > 0 && (
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const starCount = reviews.filter((r) => r.rating === star).length;
                const pct = count > 0 ? (starCount / count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-right text-slate-600 dark:text-slate-400">{star}</span>
                    <span className="text-amber-500">★</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-slate-500 dark:text-slate-400">{starCount}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Individual reviews */}
      <Card>
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Student Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-600 dark:text-slate-400">No reviews yet. Ratings will appear here after students rate completed sessions.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 text-sm">{'★'.repeat(r.rating)}<span className="text-slate-300 dark:text-slate-600">{'★'.repeat(5 - r.rating)}</span></span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {r.student_display_name || r.student_email || 'Student'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
