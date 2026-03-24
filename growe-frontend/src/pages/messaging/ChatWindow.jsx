import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Button from '../../components/ui/Button';

export default function ChatWindow({ conversationId, conversation, participants, onConversationLoad }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);
  const typingTimeoutRef = useRef({});

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async (pageNum = 1, append = false) => {
    if (!conversationId) return;
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const { data } = await api.get(`/conversations/${conversationId}/messages`, { params: { page: pageNum, limit: 20 } });
      setMessages((prev) => (append ? [...(data || []), ...prev] : (data || [])));
      setHasMore((data || []).length === 20);
      if (pageNum === 1) {
        setPage(1);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, toast, scrollToBottom]);

  useEffect(() => {
    if (!conversationId) return;
    loadMessages(1, false);
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit('join-conversation', { conversationId }, (res) => {
      if (res?.error) toast.error(res.error);
    });
    api.post(`/conversations/${conversationId}/read`).catch(() => {});
    return () => {
      socket.emit('leave-conversation', { conversationId });
    };
  }, [socket, conversationId, toast]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    const onReceive = (msg) => {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        scrollToBottom();
      }
    };
    const onEdited = (msg) => {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      }
    };
    const onDeleted = (payload) => {
      if (payload.conversationId === conversationId) {
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      }
    };
    const onTyping = (data) => {
      if (data.userId !== user?.id) setTypingUserIds((s) => new Set([...s, data.userId]));
    };
    const onStopTyping = (data) => {
      setTypingUserIds((s) => {
        const next = new Set(s);
        next.delete(data.userId);
        return next;
      });
    };
    socket.on('receive-message', onReceive);
    socket.on('message-edited', onEdited);
    socket.on('message-deleted', onDeleted);
    socket.on('typing', onTyping);
    socket.on('stop-typing', onStopTyping);
    return () => {
      socket.off('receive-message', onReceive);
      socket.off('message-edited', onEdited);
      socket.off('message-deleted', onDeleted);
      socket.off('typing', onTyping);
      socket.off('stop-typing', onStopTyping);
    };
  }, [socket, conversationId, user?.id, scrollToBottom]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !socket || !conversationId) return;
    setSending(true);
    setInput('');
    socket.emit(
      'send-message',
      { conversationId, content: text },
      (res) => {
        if (res?.error) {
          toast.error(res.error);
          setInput(text);
        } else if (res?.message) {
          setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
          scrollToBottom();
        }
        socket.emit('stop-typing', { conversationId });
      }
    );
    setSending(false);
  };

  const handleTyping = () => {
    if (!socket || !conversationId) return;
    socket.emit('typing', { conversationId });
    if (typingTimeoutRef.current[conversationId]) clearTimeout(typingTimeoutRef.current[conversationId]);
    typingTimeoutRef.current[conversationId] = setTimeout(() => {
      socket.emit('stop-typing', { conversationId });
    }, 3000);
  };

  const handleEdit = (messageId, content) => {
    if (!socket) return;
    socket.emit('edit-message', { messageId, content }, (res) => {
      if (res?.error) toast.error(res.error);
      else if (res?.message) setMessages((prev) => prev.map((m) => (m.id === res.message.id ? res.message : m)));
    });
  };

  const handleDelete = (messageId) => {
    if (!socket) return;
    socket.emit('delete-message', { messageId }, (res) => {
      if (res?.error) toast.error(res.error);
      else setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage, true);
  };

  const title =
    conversation?.group_name ||
    (conversation?.type === 'DIRECT' ? conversation?.direct_other_display_name || conversation?.direct_other_email || 'Direct' : 'Chat');

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 p-8 text-center min-h-[12rem]">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-md border border-slate-200 dark:border-slate-700 max-w-sm">
          <p className="text-slate-700 dark:text-slate-200 font-medium">Start a conversation</p>
          <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">
            Choose a chat from the list or tap New message to find someone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col-reverse min-h-0">
        <div ref={messagesEndRef} />
        {loading ? (
          <div className="flex justify-center py-8 text-slate-500 dark:text-slate-400">Loading messages...</div>
        ) : (
          <div className="p-4 space-y-3">
            {hasMore && (
              <div ref={messagesTopRef} className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-growe-dark font-medium rounded-2xl px-4 py-2 hover:bg-growe/10 transition-all duration-200"
                >
                  {loadingMore ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
        {typingUserIds.size > 0 && (
          <div className="px-4 pb-1">
            {[...typingUserIds].map((uid) => (
              <TypingIndicator key={uid} userId={uid} participants={participants} />
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 sticky bottom-0"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-growe/50 transition-all duration-200"
            maxLength={4000}
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !input.trim()} loading={sending}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
