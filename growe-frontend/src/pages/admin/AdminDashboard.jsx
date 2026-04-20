import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { SkeletonTable } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';

const tabClass = (active) =>
  `px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
    active ? 'bg-growe text-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
  }`;

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { socket } = useSocket();
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);

  const fetchMetrics = useCallback(() => {
    api
      .get('/admin/metrics')
      .then(({ data }) => setMetrics(data))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load metrics'));
  }, [toast]);

  const fetchData = useCallback(() => {
    setLoading(true);
    if (tab === 'users') {
      api.get('/admin/users').then(({ data }) => setUsers(data)).finally(() => setLoading(false));
    } else if (tab === 'audit') {
      api.get('/admin/audit-log').then(({ data }) => setAuditLog(data)).finally(() => setLoading(false));
    } else setLoading(false);
  }, [tab]);

  useEffect(() => {
    fetchMetrics();
    fetchData();
  }, [fetchMetrics, fetchData]);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      // Refresh metrics or specific data based on event type
      if (['admin_metric', 'user_update', 'audit_log'].includes(notif.type)) {
        fetchMetrics();
        fetchData();
      }
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, fetchMetrics, fetchData]);

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
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
    setConfirmModal(null);
  };

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Unified oversight for users, verification state, and institutional activity logs."
        className="mb-6"
      />

      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total users</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.totalUsers}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400">Active &amp; verified</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.activeUsers}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400">Verified users</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.verifiedUsers}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400">Profile incomplete</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metrics.profileIncomplete}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verified but missing academic profile</p>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {['users', 'audit'].map((t) => (
          <button key={t} type="button" onClick={() => { setTab(t); setLoading(true); }} className={tabClass(tab === t)}>
            {t === 'audit' ? 'Audit log' : 'Users'}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : tab === 'users' ? (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Email</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Name</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Role</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Provider</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Index</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Spec.</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Year / Sem</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Phone</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Profile</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Verified</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Active</th>
                  <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="bg-white dark:bg-slate-800">
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100 whitespace-nowrap">{u.email}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[140px] truncate" title={u.display_name || ''}>
                      {u.display_name || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge>{u.role_name}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{u.provider || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{u.index_number || '—'}</td>
                    <td className="px-3 py-2">{u.specialization || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      {u.academic_year != null && u.semester != null ? `${u.academic_year} / ${u.semester}` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{u.phone_number || '—'}</td>
                    <td className="px-3 py-2">
                      {u.profile_completed ? <Badge variant="success">Complete</Badge> : <Badge variant="warning">Incomplete</Badge>}
                    </td>
                    <td className="px-3 py-2">{u.is_verified ? <Badge variant="success">Yes</Badge> : <Badge variant="warning">No</Badge>}</td>
                    <td className="px-3 py-2">{u.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(u.id, u.is_active)}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      {u.role_name === 'tutor' && (
                        <Button size="sm" variant="secondary" onClick={() => handleSuspendTutor(u.id)}>
                          Suspend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveUser(u.id, u.email)}
                        disabled={currentUser?.id === u.id}
                        title={currentUser?.id === u.id ? 'Cannot remove yourself' : undefined}
                      >
                        Remove
                      </Button>
                    </td>
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
                    <td className="px-4 py-3">
                      <Badge>{log.action}</Badge>
                    </td>
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
              <Button variant="secondary" onClick={() => setConfirmModal(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onConfirmModal}>
                Confirm
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
