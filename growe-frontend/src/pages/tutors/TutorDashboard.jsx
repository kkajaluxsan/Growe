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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
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
        
        <div className="lg:col-span-1 relative">
          <div className="sticky top-24">
            <MiniCalendarWidget bookings={bookings} availability={availability} />
          </div>
        </div>
      </div>
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
    <Card className="w-full">
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
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [availableDate, setAvailableDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [durationMode, setDurationMode] = useState('preset');
  const [presetDuration, setPresetDuration] = useState(60);
  const [maxStudentsPerSlot, setMaxStudentsPerSlot] = useState(1);
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

  const todayStr = localDateInputMin();
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const handleAdd = async (e) => {
    e.preventDefault();
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (endH < startH || (endH === startH && endM <= startM)) {
      toast.warning('Change time and end time must be after start time');
      return;
    }

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
      toast.error(err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Failed');
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
    if (editForm.availableDate === todayStr && editForm.startTime < currentTimeStr) {
      toast.warning('Start time cannot be in the past for today');
      return;
    }
    const [startH, startM] = editForm.startTime.split(':').map(Number);
    const [endH, endM] = editForm.endTime.split(':').map(Number);
    if (endH < startH || (endH === startH && endM <= startM)) {
      toast.warning('Change time and end time must be after start time');
      return;
    }

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
      toast.error(err.response?.data?.error || err.response?.data?.details?.[0] || 'Failed to update availability');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this availability slot?')) return;
    try {
      await api.delete(`/tutors/availability/${id}`);
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const isTimeValid = (() => {
    if (!availableDate) return false;
    if (availableDate === todayStr && startTime < currentTimeStr) return false;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    return eH > sH || (eH === sH && eM > sM);
  })();

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <h2 className="text-lg font-semibold mb-4">Add Availability</h2>
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
              min={availableDate === todayStr ? currentTimeStr : undefined}
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
          <Button type="submit" disabled={adding || !isTimeValid} loading={adding}>
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
                      <input type="time" value={editForm.startTime} min={editForm.availableDate === todayStr ? currentTimeStr : undefined} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} className="border rounded py-2 px-3" />
                      <input type="time" value={editForm.endTime} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} className="border rounded py-2 px-3" />
                      <input type="number" min={15} max={480} value={editForm.durationMode === 'custom' ? editForm.sessionDuration : editForm.presetDuration} onChange={(e) => {
                        const n = parseInt(e.target.value, 10) || 15;
                        setEditForm((p) => p.durationMode === 'custom' ? { ...p, sessionDuration: n } : { ...p, presetDuration: n });
                      }} className="border rounded py-2 px-3" />
                      <input type="number" min={1} max={20} value={editForm.maxStudentsPerSlot} onChange={(e) => setEditForm((p) => ({ ...p, maxStudentsPerSlot: parseInt(e.target.value, 10) || 1 }))} className="border rounded py-2 px-3" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={editForm.availableDate === todayStr && editForm.startTime < currentTimeStr} onClick={() => saveEdit(a.id)}>Save</Button>
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
              <td className="px-4 py-2">{b.student_display_name || 'Student'}</td>
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
                      {r.student_display_name || 'Student'}
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

function MiniCalendarWidget({ bookings = [], availability = [] }) {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    // Keep date updated passing midnight
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = date.getDate();
  const currentMonth = date.toLocaleString('default', { month: 'long' });
  const currentYear = date.getFullYear();
  const daysInMonth = new Date(currentYear, date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, date.getMonth(), 1).getDay();

  const daysLine = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 p-1 rounded-3xl shadow-2xl hover:shadow-[0_20px_50px_rgba(16,185,129,0.4)] transition-shadow duration-500">
      <div className="bg-white/95 dark:bg-slate-900/95 rounded-[22px] p-6 h-full backdrop-blur-xl">
        <div className="flex justify-between items-start mb-8 tracking-tight">
          <div>
            <h3 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-400">
              {currentMonth}
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{currentYear}</p>
          </div>
          <div className="w-14 h-14 flex flex-col items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-inner border border-emerald-100 dark:border-emerald-500/20 transform rotate-3">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">{date.toLocaleString('default', { weekday: 'short' })}</span>
            <span className="text-2xl font-black leading-none">{today}</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-3">
          {daysLine.map(d => (
            <div key={d} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const isToday = d === today;
            
            // Check if there are bookings or availability on this specific day
            const exactDateStr = `${currentYear}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const todaysBookings = bookings.filter(b => b.start_time?.startsWith(exactDateStr));
            const hasActivity = todaysBookings.length > 0;
            const todaysAvailability = availability.filter(a => a.available_date === exactDateStr);
            const hasAvailability = todaysAvailability.length > 0;

            return (
              <div
                key={d}
                className={`relative h-10 flex flex-col items-center justify-center rounded-xl text-sm transition-all duration-300 ${
                  isToday 
                  ? 'bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white font-bold shadow-lg transform scale-110 z-10' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800 font-medium cursor-default'
                }`}
              >
                <span className={isToday ? "drop-shadow-md" : ""}>{d}</span>
                <div className="absolute bottom-1 flex gap-[2px]">
                  {hasAvailability && !isToday && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                  {hasActivity && <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-emerald-500'}`}></div>}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/50 border border-emerald-100/50 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span>Dashboard is perfectly synced.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
