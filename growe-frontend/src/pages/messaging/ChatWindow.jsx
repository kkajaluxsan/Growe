import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useDirectCall } from '../../context/DirectCallContext';
import { useToast } from '../../context/ToastContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Button from '../../components/ui/Button';

export default function ChatWindow({ conversationId, conversation, participants, callSession, onConversationLoad }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const { startOutgoingCall, canStartCall } = useDirectCall();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  /** File chosen via picker; upload + socket send happen when user clicks Send. */
  const [pendingFile, setPendingFile] = useState(null);
  const [typingUserIds, setTypingUserIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);
  const typingTimeoutRef = useRef({});
  const fileInputRef = useRef(null);
  const [localParticipants, setLocalParticipants] = useState(participants);

  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  const peerLastReadAt = useMemo(() => {
    if (!user?.id || !localParticipants?.length) return null;
    const other = localParticipants.find((p) => String(p.user_id) !== String(user.id));
    return other?.last_read_at ?? null;
  }, [localParticipants, user?.id]);

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
    api.post(`/conversations/${conversationId}/read`)
      .then(() => onConversationLoad?.())
      .catch(() => {
        // Failures are already surfaced via nodeApi `api-error` → ToastContext (avoid duplicate toasts).
      });
    return () => {
      socket.emit('leave-conversation', { conversationId });
    };
  }, [socket, conversationId, toast, onConversationLoad]);

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
    const onConversationRead = (payload) => {
      if (payload.conversationId !== conversationId) return;
      setLocalParticipants((prev) =>
        prev.map((p) =>
          String(p.user_id) === String(payload.userId) ? { ...p, last_read_at: payload.readAt } : p
        )
      );
    };
    socket.on('conversation-read', onConversationRead);
    return () => {
      socket.off('receive-message', onReceive);
      socket.off('message-edited', onEdited);
      socket.off('message-deleted', onDeleted);
      socket.off('typing', onTyping);
      socket.off('stop-typing', onStopTyping);
      socket.off('conversation-read', onConversationRead);
    };
  }, [socket, conversationId, user?.id, scrollToBottom]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !conversationId) return;
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error('File must be under 25 MB');
      return;
    }
    setPendingFile(file);
  };

  const sendWithAttachment = (file, caption) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    api
      .post(`/conversations/${conversationId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(({ data }) => {
        setInput('');
        setPendingFile(null);
        socket.emit(
          'send-message',
          { conversationId, content: caption, attachment: data },
          (res) => {
            if (res?.error) {
              toast.error(res.error);
            } else if (res?.message) {
              setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
              scrollToBottom();
              onConversationLoad?.();
            }
            socket.emit('stop-typing', { conversationId });
            setUploading(false);
          }
        );
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Upload failed');
        setUploading(false);
      });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!socket || !conversationId) return;
    const text = input.trim();

    if (pendingFile) {
      sendWithAttachment(pendingFile, text);
      return;
    }

    if (!text) return;
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
          onConversationLoad?.();
        }
        socket.emit('stop-typing', { conversationId });
        setSending(false);
      }
    );
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

  const isDirect = conversation?.type === 'DIRECT';
  const peerDisplayName =
    conversation?.direct_other_display_name || conversation?.direct_other_email || 'Contact';
  const activeCallSession =
    callSession && String(callSession.conversationId) === String(conversationId) ? callSession : null;
  const callButtonsEnabled = isDirect && canStartCall;

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
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate min-w-0">{title}</h2>
        {isDirect && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => startOutgoingCall(conversationId, 'voice', peerDisplayName, activeCallSession)}
              disabled={!callButtonsEnabled}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-40 disabled:pointer-events-none"
              title="Voice call"
              aria-label="Voice call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => startOutgoingCall(conversationId, 'video', peerDisplayName, activeCallSession)}
              disabled={!callButtonsEnabled}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-40 disabled:pointer-events-none"
              title="Video call"
              aria-label="Video call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m22 8-6 4 6 4V8Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
              </svg>
            </button>
          </div>
        )}
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
              <MessageBubble
                key={m.id}
                message={m}
                onEdit={handleEdit}
                onDelete={handleDelete}
                conversationType={conversation?.type}
                peerLastReadAt={peerLastReadAt}
              />
            ))}
          </div>
        )}
        {typingUserIds.size > 0 && (
          <div className="px-4 pb-1">
            {[...typingUserIds].map((uid) => (
              <TypingIndicator key={uid} userId={uid} participants={localParticipants} />
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 sticky bottom-0"
      >
        <div className="flex flex-col gap-2">
          {pendingFile && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-growe/40 bg-growe/10 dark:bg-growe/20 px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
              <span className="truncate" title={pendingFile.name}>
                Ready to send: <strong>{pendingFile.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPendingFile(null)}
                disabled={sending || uploading}
                className="shrink-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline text-xs"
              >
                Remove
              </button>
            </div>
          )}
          <div className="flex gap-3 items-center">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading || !conversationId}
            className="shrink-0 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-growe/50 disabled:opacity-50 transition-all duration-200"
            aria-label="Attach file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.38-8.38a4 4 0 0 1 5.66 5.66l-8.38 8.38a2 2 0 0 1-2.83-2.83l7.07-7.07" />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            placeholder={pendingFile ? 'Add a caption (optional)...' : 'Type a message or attach a file...'}
            className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-growe/50 transition-all duration-200"
            maxLength={4000}
            disabled={sending || uploading}
          />
          <Button
            type="submit"
            disabled={sending || uploading || (!input.trim() && !pendingFile)}
            loading={sending || uploading}
          >
            Send
          </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
