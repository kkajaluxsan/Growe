import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ShareButton from '../../components/ui/ShareButton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { localDateInputMin } from '../../utils/dateInput';
import GroupQuizzes from '../../components/groups/GroupQuizzes';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return localDateInputMin(d);
  });
  const [scheduleDuration, setScheduleDuration] = useState(''); // '' means default
  const [availableTutors, setAvailableTutors] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openingGroupChat, setOpeningGroupChat] = useState(false);
  const [openingTutorChat, setOpeningTutorChat] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState(null);
  const [tutorInvite, setTutorInvite] = useState(null);
  const hadPendingTutorInvite = useRef(false);

  const loadTutorInvite = useCallback(() => {
    api
      .get(`/groups/${id}/tutor-invite`, { skipGlobalErrorToast: true })
      .then(({ data }) => setTutorInvite(data || null))
      .catch(() => setTutorInvite(null));
  }, [id]);

  useEffect(() => {
    loadTutorInvite();
  }, [loadTutorInvite]);

  useEffect(() => {
    if (!tutorInvite?.id) return undefined;
    if (tutorInvite?.status !== 'pending') return undefined;
    const timer = setInterval(loadTutorInvite, 5000);
    return () => clearInterval(timer);
  }, [tutorInvite?.id, loadTutorInvite]);

  useEffect(() => {
    api.get(`/groups/${id}`)
      .then(({ data }) => setGroup(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (group) {
      api.get(`/groups/${id}/members`, { skipGlobalErrorToast: true })
        .then(({ data }) => setMembers(data))
        .catch((err) => toast.error(err.response?.data?.error || 'Failed to load group members'));
    }
  }, [group, id, toast]);

  const refreshMembers = useCallback(() => {
    api.get(`/groups/${id}/members`, { skipGlobalErrorToast: true })
      .then(({ data }) => setMembers(data))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load group members'));
  }, [id, toast]);

  useEffect(() => {
    const hadPending = hadPendingTutorInvite.current;
    const nowPending = tutorInvite?.status === 'pending';
    if (hadPending && !nowPending) {
      refreshMembers();
      if (tutorInvite?.status === 'rejected') {
        toast.error('Tutor declined your request. Choose another tutor or another slot.');
      }
    }
    hadPendingTutorInvite.current = nowPending;
  }, [tutorInvite, refreshMembers, toast]);

  const openScheduleForSameDate = () => {
    const iso = tutorInvite?.slot_start;
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setScheduleDate(`${yyyy}-${mm}-${dd}`);
      }
    }
    setScheduleModalOpen(true);
    setAvailableTutors([]);
    setTimeout(() => loadSlotsForDate(), 0);
  };

  const openScheduleFresh = () => {
    setScheduleModalOpen(true);
    setAvailableTutors([]);
  };

  const loadSlotsForDate = useCallback(() => {
    setSlotsLoading(true);
    setAvailableTutors([]);
    api.get('/tutors/available', { params: { date: scheduleDate, groupId: id, duration: scheduleDuration || undefined }, skipGlobalErrorToast: true })
      .then(({ data }) => setAvailableTutors(Array.isArray(data) ? data : []))
      .catch(() => {
        setAvailableTutors([]);
        toast.error('Failed to load available slots');
      })
      .finally(() => setSlotsLoading(false));
  }, [scheduleDate, toast, id, scheduleDuration]);

  const isCreator = !!group && !!user && group.creator_id === user.id;

  const handleApprove = (userId) => {
    api.post(`/groups/${id}/approve/${userId}`)
      .then(() => {
        toast.success('Request approved');
        refreshMembers();
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to approve'));
  };

  const handleReject = (userId) => {
    api.post(`/groups/${id}/reject/${userId}`)
      .then(() => {
        toast.success('Request rejected');
        refreshMembers();
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to reject'));
  };

  const handleCreateInvite = () => {
    setCreatingInvite(true);
    setInviteUrl('');
    api.post(`/groups/${id}/invite-link`)
      .then(({ data }) => {
        setInviteUrl(data.inviteUrl || '');
        toast.success('Invite link created');
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to create invite link'))
      .finally(() => setCreatingInvite(false));
  };

  const handleMemberSearch = () => {
    const q = memberSearch.trim();
    if (!q) {
      setMemberResults([]);
      return;
    }
    setMemberSearchLoading(true);
    api.get(`/groups/${id}/member-search`, { params: { q, limit: 10 } })
      .then(({ data }) => setMemberResults(Array.isArray(data) ? data : []))
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Member search failed');
        setMemberResults([]);
      })
      .finally(() => setMemberSearchLoading(false));
  };

  const handleAddMember = (userId) => {
    setAddingMemberId(userId);
    api.post(`/groups/${id}/members`, { userId })
      .then(() => {
        toast.success('Member added');
        setMemberResults([]);
        setMemberSearch('');
        refreshMembers();
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to add member'))
      .finally(() => setAddingMemberId(null));
  };

  const handleRequestJoin = () => {
    api.post(`/groups/${id}/join-request`)
      .then(() => {
        setError('');
        toast.success('Join request sent');
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'Failed';
        setError(msg);
        toast.error(msg);
      });
  };

  const handleCreateMeeting = () => {
    api.post('/meetings', { groupId: id, title: 'Group Meeting' })
      .then(({ data }) => {
        toast.success('Meeting created');
        navigate(`/meetings/${data.id}`);
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'Failed to create meeting';
        setError(msg);
        toast.error(msg);
      });
  };

  const handleOpenGroupChat = () => {
    setOpeningGroupChat(true);
    api.post(`/conversations/group/${id}`)
      .then(({ data }) => {
        navigate('/messages', { state: { conversation: data } });
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to open group chat');
      })
      .finally(() => setOpeningGroupChat(false));
  };

  const handleOpenTutorSessionChat = () => {
    if (!tutorInvite?.booking_id || tutorInvite?.status !== 'accepted') {
      toast.error('No accepted tutor session found for this group.');
      return;
    }

    const isRequester = String(user?.id) === String(tutorInvite.requested_by);
    const isTutor = String(user?.id) === String(tutorInvite.tutor_user_id);
    const otherUserId = isRequester ? tutorInvite.tutor_user_id : tutorInvite.requested_by;
    const callerRole = isRequester ? 'student' : isTutor ? 'tutor' : null;

    if (!otherUserId || !callerRole) {
      toast.error('Only the session requester or assigned tutor can open the tutor session call.');
      return;
    }

    setOpeningTutorChat(true);
    api.post(`/conversations/direct/${otherUserId}`)
      .then(({ data }) => {
        navigate('/messages', {
          state: {
            conversation: data,
            callSession: {
              conversationId: data.id,
              bookingId: tutorInvite.booking_id,
              callerRole,
            },
          },
        });
        toast.success('Tutor session chat opened. Use voice/video to start or join.');
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to open tutor session chat');
      })
      .finally(() => setOpeningTutorChat(false));
  };

  const handleScheduleWithTutor = (tutor, slot) => {
    if (slot?.startTime && new Date(slot.startTime).getTime() <= Date.now()) {
      toast.error('This time slot is in the past. Pick another slot.');
      return;
    }
    setCreating(true);
    api.post('/meetings', {
      groupId: id,
      title: `Group Meeting with ${tutor.display_name || tutor.displayName || 'Tutor'}`,
      scheduledAt: slot.startTime,
      tutorId: tutor.tutorId,
      slot: {
        availabilityId: slot.availabilityId,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    })
      .then(({ data }) => {
        toast.success('Meeting scheduled. Tutor slot reserved.');
        setScheduleModalOpen(false);
        navigate(`/meetings/${data.id}`);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to schedule meeting');
      })
      .finally(() => setCreating(false));
  };

  if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800" />;
  if (!group) return <div className="text-red-600">{error || 'Group not found'}</div>;

  const groupShareUrl = typeof window !== 'undefined' ? `${window.location.origin}/groups/${id}` : '';
  const groupShareText = `Join my study group "${group.name}" on GROWE`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{group.name}</h1>
        <ShareButton
          title={`Invite to ${group.name}`}
          shareText={groupShareText}
          url={groupShareUrl}
          variant="secondary"
        />
      </div>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}
      {tutorInvite?.status === 'pending' && (
        <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50 dark:bg-amber-950/35 dark:border-amber-800 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-semibold">Pending tutor approval</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/95">
            We sent a request to{' '}
            <span className="font-medium">{tutorInvite.tutor_display_name || 'the tutor'}</span>
            {tutorInvite.slot_start
              ? ` for ${new Date(tutorInvite.slot_start).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}`
              : ''}
            . The group remains student-only until they accept. You’ll get a notification when they respond.
          </p>
        </div>
      )}
      {tutorInvite?.status === 'rejected' && (
        <div className="mb-4 rounded-xl border border-red-200/90 bg-red-50 dark:bg-red-950/35 dark:border-red-800 px-4 py-3 text-sm text-red-900 dark:text-red-100">
          <p className="font-semibold">Tutor declined your request</p>
          <p className="mt-1 text-red-800/95 dark:text-red-200/95">
            {tutorInvite.tutor_display_name || 'Selected tutor'} declined to tutor this group.
            Choose another tutor for the same date or pick a different slot.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={openScheduleForSameDate}>Find Another Tutor (Same Date)</Button>
            <Button size="sm" variant="secondary" onClick={openScheduleFresh}>Choose Another Slot</Button>
          </div>
        </div>
      )}
      {tutorInvite?.status === 'accepted' && (
        <div className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50 dark:bg-emerald-950/35 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          <p className="font-semibold">Tutor session confirmed</p>
          <p className="mt-1 text-emerald-800/95 dark:text-emerald-200/95">
            {tutorInvite.tutor_display_name || 'Your tutor'} accepted this group session.
            Open the tutor session chat when it is time to start or join.
          </p>
          <div className="mt-3">
            <Button size="sm" onClick={handleOpenTutorSessionChat} disabled={openingTutorChat}>
              {openingTutorChat ? 'Opening…' : 'Open Tutor Session Chat'}
            </Button>
          </div>
        </div>
      )}
      <p className="text-slate-600 dark:text-slate-400 mb-6">{group.description || 'No description'}</p>
      <div className="flex flex-wrap gap-3 mb-6">
        {isCreator && (
          <>
            <Button variant="secondary" onClick={handleCreateInvite} disabled={creatingInvite}>
              {creatingInvite ? 'Creating invite…' : 'Create invite link'}
            </Button>
            {inviteUrl && (
              <ShareButton
                title={`Join ${group.name}`}
                shareText={`Join "${group.name}" on GROWE`}
                url={inviteUrl}
                variant="secondary"
              />
            )}
          </>
        )}
        <Button variant="secondary" onClick={handleOpenGroupChat} disabled={openingGroupChat}>
          {openingGroupChat ? 'Opening…' : 'Group chat'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/groups/${id}/focus`)}>
          Enter Focus Room
        </Button>
        <Button variant="secondary" onClick={handleCreateMeeting}>Start Meeting Now</Button>
        <Button variant="secondary" onClick={() => { setScheduleModalOpen(true); setAvailableTutors([]); }}>
          Schedule Meeting with Tutor
        </Button>
      </div>

      {isCreator && (
        <Card className="mb-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Add member</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search users</label>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Email or display name"
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 w-72"
              />
            </div>
            <Button variant="secondary" onClick={handleMemberSearch} disabled={memberSearchLoading}>
              {memberSearchLoading ? 'Searching…' : 'Search'}
            </Button>
          </div>
          {memberResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {memberResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{u.display_name || 'User'}</div>
                  </div>
                  <Button size="sm" onClick={() => handleAddMember(u.id)} disabled={addingMemberId === u.id}>
                    {addingMemberId === u.id ? 'Adding…' : 'Add'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <GroupQuizzes groupId={id} />

      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Members ({members.length})</h2>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex justify-between text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <span>{m.display_name || 'Member'}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">({m.status})</span>
            </span>
            {isCreator && m.status === 'pending' ? (
              <span className="flex items-center gap-2">
                <Button size="sm" variant="success" onClick={() => handleApprove(m.user_id)}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => handleReject(m.user_id)}>Reject</Button>
              </span>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">{m.status}</span>
            )}
          </li>
        ))}
      </ul>

      <Modal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="Schedule meeting with a tutor" size="lg">
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
          Pick a date and load available tutor slots. Selecting a slot reserves the tutor for your group and creates the meeting.
        </p>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={localDateInputMin()}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration</label>
            <select
              value={scheduleDuration}
              onChange={(e) => setScheduleDuration(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            >
              <option value="">Default</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes</option>
              <option value="90">90 Minutes</option>
            </select>
          </div>
          <Button variant="secondary" onClick={loadSlotsForDate} disabled={slotsLoading}>
            {slotsLoading ? 'Loading...' : 'Show available tutors'}
          </Button>
        </div>
        {availableTutors.length === 0 && !slotsLoading && (
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Select a date and click &quot;Show available tutors&quot;. If no tutors appear, none are available on that date.
          </p>
        )}
        {availableTutors.length > 0 && (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {availableTutors.map((t) => (
              <div key={t.tutorId} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-1 mb-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{t.display_name || t.displayName || 'Tutor'}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{t.bio || 'No bio'}</div>
                </div>
                {Array.isArray(t.slots) && t.slots.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {t.slots.map((s, i) => (
                      <div key={`${s.availabilityId}-${s.startTime}-${i}`} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {new Date(s.startTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <Button size="sm" onClick={() => handleScheduleWithTutor(t, s)} disabled={creating}>
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">No open slots for this tutor on this date.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
