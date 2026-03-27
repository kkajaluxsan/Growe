import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return '';
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** WhatsApp-style: one tick = sent; two blue ticks = read (direct chats only). */
function ReadReceipt({ read, singleOnly }) {
  const Tick = ({ className }) => (
    <svg
      className={`w-[13px] h-[13px] shrink-0 ${className || ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  if (singleOnly) {
    return (
      <span className="inline-flex text-slate-500/85 dark:text-slate-400/90" title="Sent">
        <Tick />
      </span>
    );
  }
  if (read) {
    return (
      <span className="inline-flex items-center text-sky-500 dark:text-sky-400" title="Read">
        <Tick className="-mr-[7px]" />
        <Tick />
      </span>
    );
  }
  return (
    <span className="inline-flex text-slate-500/85 dark:text-slate-400/90" title="Sent">
      <Tick />
    </span>
  );
}

export default function MessageBubble({ message, onEdit, onDelete, conversationType, peerLastReadAt }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isOwn = message.sender_id === user?.id;
  const isSystem = message.message_type === 'SYSTEM';

  useEffect(() => {
    setEditContent(message.content);
  }, [message.content, message.id]);

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this message?')) onDelete(message.id);
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  const displayName = message.sender_display_name || message.sender_email || 'Unknown';

  const isReadByPeer =
    conversationType === 'DIRECT' &&
    peerLastReadAt &&
    new Date(peerLastReadAt).getTime() >= new Date(message.created_at).getTime();

  return (
    <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isOwn ? 'items-end ml-auto' : 'items-start'}`}>
      {!isOwn && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5 px-1">{displayName}</span>
      )}
      <div
        className={`rounded-2xl px-4 py-2 break-words shadow-sm ${
          isOwn
            ? 'bg-growe text-slate-900 rounded-br-md'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-md'
        }`}
      >
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[60px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1.5 text-sm"
              maxLength={4000}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        ) : (
          <>
            {message.message_type === 'FILE' && message.attachment_url && (
              <div className="mb-2 space-y-1">
                {message.attachment_mime?.startsWith('image/') ? (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={message.attachment_url}
                      alt=""
                      className="max-w-full max-h-64 rounded-lg border border-slate-200/50 dark:border-slate-600/50 object-contain"
                    />
                  </a>
                ) : (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={message.attachment_name || undefined}
                    className="inline-flex items-center gap-1.5 text-sm font-medium underline break-all"
                  >
                    <span className="truncate max-w-[240px]">{message.attachment_name || 'Download file'}</span>
                  </a>
                )}
                {message.attachment_size != null && (
                  <span className="text-xs opacity-75">({formatFileSize(message.attachment_size)})</span>
                )}
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <div className="flex items-center justify-end gap-1.5 mt-1 flex-wrap">
              {message.edited_at && (
                <span className="text-xs opacity-75">(edited)</span>
              )}
              <span className="text-xs opacity-75">{formatTime(message.created_at)}</span>
              {isOwn && !isSystem && conversationType === 'DIRECT' && (
                <ReadReceipt read={!!isReadByPeer} />
              )}
              {isOwn && !isSystem && conversationType && conversationType !== 'DIRECT' && (
                <ReadReceipt read={false} singleOnly />
              )}
              {isOwn && !isSystem && (
                <span className="flex gap-1">
                  <button type="button" onClick={() => setEditing(true)} className="text-xs underline text-slate-800/90 hover:text-slate-900">
                    Edit
                  </button>
                  <button type="button" onClick={handleDelete} className="text-xs underline text-slate-800/90 hover:text-slate-900">
                    Delete
                  </button>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
