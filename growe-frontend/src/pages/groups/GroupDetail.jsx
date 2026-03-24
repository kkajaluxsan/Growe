import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ShareButton from '../../components/ui/ShareButton';
import { useToast } from '../../context/ToastContext';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
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
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openingGroupChat, setOpeningGroupChat] = useState(false);

  useEffect(() => {
    api.get(`/groups/${id}`)
      .then(({ data }) => setGroup(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (group) {
      api.get(`/groups/${id}/members`)
        .then(({ data }) => setMembers(data))
        .catch(() => {});
    }
  }, [group, id]);

  const loadSlotsForDate = useCallback(() => {
    setSlotsLoading(true);
    setSlots([]);
    api.get('/tutors/slots', { params: { fromDate: scheduleDate, toDate: scheduleDate } })
      .then(({ data }) => setSlots(Array.isArray(data) ? data : []))
      .catch(() => {
        setSlots([]);
        toast.error('Failed to load available slots');
      })
      .finally(() => setSlotsLoading(false));
  }, [scheduleDate, toast]);

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

  const handleScheduleWithTutor = (slot) => {
    setCreating(true);
    api.post('/meetings', {
      groupId: id,
      title: `Group Meeting with ${slot.tutorEmail}`,
      scheduledAt: slot.start,
      tutorId: slot.tutorId,
      slot: {
        availabilityId: slot.availabilityId,
        startTime: slot.start,
        endTime: slot.end,
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
        <Button onClick={handleRequestJoin}>Request to Join</Button>
        <Button variant="secondary" onClick={handleOpenGroupChat} disabled={openingGroupChat}>
          {openingGroupChat ? 'Opening…' : 'Group chat'}
        </Button>
        <Button variant="secondary" onClick={handleCreateMeeting}>Start Meeting Now</Button>
        <Button variant="secondary" onClick={() => { setScheduleModalOpen(true); setSlots([]); }}>
          Schedule Meeting with Tutor
        </Button>
      </div>

      <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Members ({members.length})</h2>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex justify-between text-slate-700 dark:text-slate-300">
            <span>{m.email}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{m.status}</span>
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
        {slots.length === 0 && !slotsLoading && (
          <p className="text-slate-500 dark:text-slate-400 text-sm">Select a date and click &quot;Show available tutors&quot; to see slots.</p>
        )}
        {slots.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {slots.map((s, i) => (
              <div
                key={`${s.availabilityId}-${s.start}-${i}`}
                className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <span className="text-sm">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{s.tutorEmail}</span>
                  <span className="text-slate-500 dark:text-slate-400"> — {new Date(s.start).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                </span>
                <Button size="sm" onClick={() => handleScheduleWithTutor(s)} disabled={creating}>
                  Select
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
