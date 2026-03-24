import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/ui/Modal';

const DEBOUNCE_MS = 300;

export default function StartNewConversationModal({ open, onClose, onConversationStarted }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(null);

  const fetchUsers = useCallback(async (q) => {
    setLoading(true);
    try {
      const { data } = await api.get('/conversations/eligible-users', {
        params: { q: q.trim() || undefined, limit: 30 },
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    fetchUsers('');
  }, [open, fetchUsers]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => fetchUsers(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, open, fetchUsers]);

  const handleSelect = async (selectedUser) => {
    if (starting) return;
    setStarting(selectedUser.id);
    try {
      const { data } = await api.post(`/conversations/direct/${selectedUser.id}`);
      onConversationStarted(data);
      onClose();
      setSearch('');
      setUsers([]);
    } catch (err) {
      const res = err.response?.data;
      const message =
        res?.code === 'MESSAGING_NOT_ALLOWED'
          ? res?.error || 'You can only message study group members or users you have a confirmed booking with.'
          : res?.error || 'Failed to start conversation';
      toast.error(message);
    } finally {
      setStarting(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New message" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Search for someone in your study groups or with a confirmed booking. Admins can message anyone.
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600">
          {loading && !users.length ? (
            <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400 text-sm">
              Loading...
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              {search.trim() ? 'No matching users you can message.' : 'No one to message yet. Join a study group or book a tutor.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-600">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(u)}
                    disabled={starting !== null}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-60 transition-colors"
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-medium shrink-0">
                        {(u.display_name || u.email || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {u.display_name || u.email}
                      </p>
                      {u.display_name && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                      )}
                      {u.role_name && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{u.role_name}</span>
                      )}
                    </div>
                    {starting === u.id ? (
                      <span className="text-sm text-slate-500">Starting...</span>
                    ) : (
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Message</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
