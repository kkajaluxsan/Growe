import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ShareButton from '../../components/ui/ShareButton';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

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
    return d.toISOString().slice(0, 10);
  });
  const [availableTutors, setAvailableTutors] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openingGroupChat, setOpeningGroupChat] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState(null);

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

  const loadSlotsForDate = useCallback(() => {
    setSlotsLoading(true);
    setAvailableTutors([]);
    api.get('/tutors/available', { params: { date: scheduleDate, groupId: id }, skipGlobalErrorToast: true })
      .then(({ data }) => setAvailableTutors(Array.isArray(data) ? data : []))
      .catch(() => {
        setAvailableTutors([]);
        toast.error('Failed to load available slots');
      })
      .finally(() => setSlotsLoading(false));
  }, [scheduleDate, toast, id]);

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

  const handleScheduleWithTutor = (tutor, slot) => {
    setCreating(true);
    api.post('/meetings', {
      groupId: id,
      title: `Group Meeting with ${tutor.email}`,
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
                    <div className="font-medium text-slate-900 dark:text-slate-100">{u.email}</div>
                    {u.display_name && <div className="text-slate-500 dark:text-slate-400">{u.display_name}</div>}
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

      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Members ({members.length})</h2>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex justify-between text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <span>{m.email}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">({m.status})</span>
            </span>
            {isCreator && m.status === 'pending' ? (
              <span className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleApprove(m.user_id)}>Approve</Button>
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
              min={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2"
            />
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
                  <div className="font-medium text-slate-900 dark:text-slate-100">{t.email}</div>
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
