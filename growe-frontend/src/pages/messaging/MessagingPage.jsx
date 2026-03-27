import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import StartNewConversationModal from './StartNewConversationModal';

export default function MessagingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [newConversationModalOpen, setNewConversationModalOpen] = useState(false);

  useEffect(() => {
    const conv = location.state?.conversation;
    if (conv?.id) {
      setSelectedConversation(conv);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.conversation?.id, location.pathname, navigate]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/conversations');
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversation?.id) {
      setParticipants([]);
      return;
    }
    api.get(`/conversations/${selectedConversation.id}`)
      .then(({ data }) => {
        setSelectedConversation((prev) => (prev ? { ...prev, ...data } : null));
        setParticipants(data?.participants || []);
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to load conversation');
        setParticipants([]);
      });
  }, [selectedConversation?.id, toast]);

  const handleConversationStarted = useCallback(
    (conversation) => {
      loadConversations();
      setSelectedConversation(conversation);
    },
    [loadConversations]
  );

  return (
    <div className="min-h-[calc(100vh-7rem)] flex flex-col lg:flex-row rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-md">
      <div className="w-full lg:w-80 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 min-h-0 shrink-0 lg:max-h-[calc(100vh-7rem)]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Messages</h1>
            <Button size="sm" onClick={() => setNewConversationModalOpen(true)}>
              New message
            </Button>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <ConversationList
            selectedId={selectedConversation?.id}
            onSelect={setSelectedConversation}
            conversations={conversations}
            loading={loading}
          />
        </div>
      </div>
      <ChatWindow
        conversationId={selectedConversation?.id}
        conversation={selectedConversation}
        participants={participants}
        onConversationLoad={loadConversations}
      />
      <StartNewConversationModal
        open={newConversationModalOpen}
        onClose={() => setNewConversationModalOpen(false)}
        onConversationStarted={handleConversationStarted}
      />
    </div>
  );
}
