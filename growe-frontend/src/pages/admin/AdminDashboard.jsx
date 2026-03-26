import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { SkeletonTable } from '../../components/ui/Skeleton';

const tabClass = (active) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    active ? 'bg-slate-800 text-white dark:bg-slate-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
  }`;

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [reliabilityRanking, setReliabilityRanking] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    api.get('/admin/metrics')
      .then(({ data }) => setMetrics(data))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load metrics'));
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    if (tab === 'users') {
      api.get('/admin/users').then(({ data }) => setUsers(data)).finally(() => setLoading(false));
    } else if (tab === 'bookings') {
      api.get('/admin/bookings/logs').then(({ data }) => setBookings(data)).finally(() => setLoading(false));
    } else if (tab === 'audit') {
      api.get('/admin/audit-log').then(({ data }) => setAuditLog(data)).finally(() => setLoading(false));
    } else if (tab === 'meetings') {
      api.get('/admin/meetings').then(({ data }) => setMeetings(data)).finally(() => setLoading(false));
    } else if (tab === 'reliability') {
      api.get('/admin/reliability-ranking').then(({ data }) => setReliabilityRanking(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
    } else setLoading(false);
  }, [tab]);

  const handleToggleActive = async (userId, isActive) => {
    try {
      await api.patch(`/admin/users/${userId}`, { isActive: !isActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u)));
      toast.success(isActive ? 'User deactivated' : 'User activated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleSuspendTutor = (userId) => {
    setConfirmModal({ type: 'suspend', userId, message: 'Suspend this tutor? They will not receive new bookings.' });
  };

  const handleRemoveUser = (userId, userEmail) => {
    setConfirmModal({ type: 'remove', userId, userEmail, message: `Permanently remove "${userEmail}"? This cannot be undone.` });
  };

  const handleTerminateMeeting = (meetingId) => {
    setConfirmModal({ type: 'terminate', meetingId, message: 'Force end this meeting? All participants will be disconnected.' });
  };

  const onConfirmModal = async () => {
    if (!confirmModal) return;
    try {
      if (confirmModal.type === 'suspend') {
        await api.post(`/admin/tutors/${confirmModal.userId}/suspend`);
        toast.success('Tutor suspended');
      } else if (confirmModal.type === 'remove') {
        await api.delete(`/admin/users/${confirmModal.userId}`);
        setUsers((prev) => prev.filter((u) => u.id !== confirmModal.userId));
        toast.success('User removed');
      } else if (confirmModal.type === 'terminate') {
        await api.post(`/admin/meetings/${confirmModal.meetingId}/terminate`);
        setMeetings((prev) => prev.filter((m) => m.id !== confirmModal.meetingId));
        toast.success('Meeting terminated');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
    setConfirmModal(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Admin Dashboard</h1>

      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total users</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.totalUsers}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400">Active users</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.activeUsers}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bookings today</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.bookingsToday}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400">Active meetings</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.activeMeetings}</p>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {['users', 'bookings', 'meetings', 'reliability', 'audit'].map((t) => (
          <button key={t} onClick={() => { setTab(t); setLoading(true); }} className={tabClass(tab === t)}>
            {t === 'audit' ? 'Audit log' : t === 'bookings' ? 'Booking logs' : t === 'meetings' ? 'Active meetings' : t === 'reliability' ? 'Reliability ranking' : 'Users'}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : tab === 'users' ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Verified</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Active</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{u.email}</td>
                    <td className="px-4 py-3"><Badge>{u.role_name}</Badge></td>
                    <td className="px-4 py-3">{u.is_verified ? <Badge variant="success">Yes</Badge> : <Badge variant="warning">No</Badge>}</td>
                    <td className="px-4 py-3">{u.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(u.id, u.is_active)}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      {u.role_name === 'tutor' && (
                        <Button size="sm" variant="secondary" onClick={() => handleSuspendTutor(u.id)}>Suspend</Button>
                      )}
                      <Button size="sm" variant="danger" onClick={() => handleRemoveUser(u.id, u.email)} disabled={currentUser?.id === u.id} title={currentUser?.id === u.id ? 'Cannot remove yourself' : undefined}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : tab === 'meetings' ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Group</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Started</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {meetings.length === 0 && !loading && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No active meetings</td></tr>
                )}
                {meetings.map((m) => (
                  <tr key={m.id} className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{m.group_name}</td>
                    <td className="px-4 py-3 text-sm">{m.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="danger" onClick={() => handleTerminateMeeting(m.id)}>Terminate</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : tab === 'bookings' ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Tutor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {bookings.map((b) => (
                  <tr key={b.id} className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-3 text-sm">{b.student_email}</td>
                    <td className="px-4 py-3 text-sm">{b.tutor_email}</td>
                    <td className="px-4 py-3 text-sm">{new Date(b.start_time).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant={b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'error' : 'default'}>{b.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : tab === 'reliability' ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {reliabilityRanking.length === 0 && !loading && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">No booking history yet</td></tr>
                )}
                {reliabilityRanking.map((r, i) => (
                  <tr key={r.id} className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{r.display_name || r.email}</td>
                    <td className="px-4 py-3 text-sm font-medium">{Number(r.score).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {auditLog.map((log) => (
                  <tr key={log.id} className="bg-white dark:bg-slate-800">
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge>{log.action}</Badge></td>
                    <td className="px-4 py-3 text-sm">{log.details ? JSON.stringify(log.details) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirm">
        {confirmModal && (
          <>
            <p className="text-slate-600 dark:text-slate-400">{confirmModal.message}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setConfirmModal(null)}>Cancel</Button>
              <Button variant="danger" onClick={onConfirmModal}>Confirm</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
