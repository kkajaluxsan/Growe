import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

export default function MessageBubble({ message, onEdit, onDelete }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isOwn = message.sender_id === user?.id;

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
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <div className="flex items-center justify-end gap-2 mt-1">
              {message.edited_at && (
                <span className="text-xs opacity-75">(edited)</span>
              )}
              <span className="text-xs opacity-75">{formatTime(message.created_at)}</span>
              {isOwn && (
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
