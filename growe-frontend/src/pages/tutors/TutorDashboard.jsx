import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { localDateInputMin } from '../../utils/dateInput';
import TutorRequestPanel from '../../components/bookings/TutorRequestPanel';
import GroupTutorInvitePanel from '../../components/bookings/GroupTutorInvitePanel';
import TutorBookingCalendar from '../../components/bookings/TutorBookingCalendar';

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
    return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800" />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tutor Dashboard</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`rounded px-4 py-2 ${activeTab === 'profile' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}`}
        >
          My Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`rounded px-4 py-2 ${activeTab === 'availability' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}`}
        >
          My Availability
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`rounded px-4 py-2 ${activeTab === 'schedule' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}`}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`rounded px-4 py-2 ${activeTab === 'bookings' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}`}
        >
          My Bookings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ratings')}
          className={`rounded px-4 py-2 ${activeTab === 'ratings' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'}`}
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
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
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
        <button type="submit" disabled={saving} className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50">
          {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
        </button>
      </form>
    </div>
  );
}

function TutorAvailabilitySection({ availability, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [availableDate, setAvailableDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [maxStudentsPerSlot, setMaxStudentsPerSlot] = useState(1);
  const [error, setError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      await api.post('/tutors/availability', {
        availableDate,
        startTime: startTime + ':00',
        endTime: endTime + ':00',
        sessionDuration,
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
      <div className="bg-white rounded-lg shadow p-6 max-w-xl">
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
            <input
              type="number"
              min={15}
              max={480}
              value={sessionDuration}
              onChange={(e) => setSessionDuration(parseInt(e.target.value, 10))}
              className="border rounded py-2 px-3 w-24"
            />
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
          <button type="submit" disabled={adding} className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50">
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Your Availability Slots</h2>
        {availability.length === 0 ? (
          <p className="text-gray-600">No availability added yet. Add slots above.</p>
        ) : (
          <ul className="space-y-2">
            {availability.map((a) => (
              <li key={a.id} className="flex justify-between items-center py-2 border-b">
                <span>{a.available_date} {a.start_time?.slice(0, 5)} – {a.end_time?.slice(0, 5)} ({a.session_duration} min)</span>
                <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:underline text-sm">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TutorBookingsSection({ bookings, onUpdate, onAfterGroupInviteAccept }) {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState('');
  const [groupInvites, setGroupInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [actingInviteId, setActingInviteId] = useState(null);

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

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 overflow-x-auto">
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
                  <>
                    <button onClick={() => handleStatus(b.id, 'confirmed')} className="text-green-600 hover:underline mr-2">Confirm</button>
                    <button onClick={() => handleStatus(b.id, 'cancelled')} className="text-red-600 hover:underline">Decline</button>
                  </>
                )}
                {b.status === 'confirmed' && (
                  <>
                    <button onClick={() => handleStatus(b.id, 'completed')} className="text-green-600 hover:underline mr-2">Complete</button>
                    <button onClick={() => handleStatus(b.id, 'no_show')} className="text-amber-600 hover:underline mr-2">No-Show</button>
                    <button onClick={() => handleStatus(b.id, 'cancelled')} className="text-red-600 hover:underline">Cancel</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        )}
      </div>
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
    return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800" />;
  }

  const { average = 0, count = 0, reviews = [] } = data || {};
  const roundedAvg = Math.round(average);

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
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
      </div>

      {/* Individual reviews */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
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
      </div>
    </div>
  );
}
