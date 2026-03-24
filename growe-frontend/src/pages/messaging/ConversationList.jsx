import { useMemo, useState } from 'react';
import Input from '../../components/ui/Input';

function conversationTitle(c) {
  if (c.type === 'GROUP' && c.group_name) return c.group_name;
  if (c.type === 'DIRECT') return c.direct_other_display_name || c.direct_other_email || 'Direct chat';
  if (c.type === 'MEETING') return 'Meeting chat';
  return 'Chat';
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConversationList({ selectedId, onSelect, conversations, loading }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations || [];
    return (conversations || []).filter((c) => conversationTitle(c).toLowerCase().includes(q));
  }, [conversations, query]);

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <div className="h-10 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <Input
          type="search"
          placeholder="Search conversations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputClassName="py-2 text-sm"
        />
      </div>
      {!conversations?.length ? (
        <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
          <p className="font-medium text-slate-700 dark:text-slate-200">No conversations yet</p>
          <p className="mt-2">Use <span className="font-semibold text-growe-dark">New message</span> to find someone and start chatting.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">No matches for your search.</div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700 overflow-y-auto flex-1 min-h-0">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-growe/10 dark:hover:bg-growe/10 transition-all duration-200 ${
                  selectedId === c.id ? 'bg-growe/15 dark:bg-growe/20' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {conversationTitle(c)}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 rounded-full bg-growe text-slate-900 text-xs font-semibold min-w-[1.25rem] h-5 flex items-center justify-center px-1.5 shadow-sm">
                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                      </span>
                    )}
                  </div>
                  {c.last_message_content && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {c.last_message_content}
                    </p>
                  )}
                  {c.last_message_at && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatTime(c.last_message_at)}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
