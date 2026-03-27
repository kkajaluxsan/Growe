import { useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/ui/Modal';
import UserSearchDropdown from '../../components/common/UserSearchDropdown';

export default function StartNewConversationModal({ open, onClose, onConversationStarted }) {
  const { toast } = useToast();
  const [starting, setStarting] = useState(null);

  const handleSelect = async (selectedUser) => {
    if (!selectedUser?.id || starting) return;
    setStarting(selectedUser.id);
    try {
      const { data } = await api.post(`/conversations/direct/${selectedUser.id}`);
      onConversationStarted(data);
      onClose();
    } catch (err) {
      const res = err.response?.data;
      const message =
        res?.code === 'MESSAGING_NOT_ALLOWED'
          ? res?.error || 'You can only message active, verified users.'
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
          Search for a verified user by name or email. Direct messages require both parties to be verified (you already are if you see this screen).
        </p>
        <UserSearchDropdown
          disabled={!!starting}
          onSelectUser={handleSelect}
          placeholder="Search by name or email…"
        />
        {starting && (
          <p className="text-sm text-slate-500">Starting conversation…</p>
        )}
      </div>
    </Modal>
  );
}
