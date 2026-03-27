import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const DEBOUNCE_MS = 300;

/**
 * Teams-like user picker: searches verified users via GET /api/users/search
 */
export default function UserSearchDropdown({
  onSelectUser,
  placeholder = 'Search by name or email…',
  disabled = false,
  className = '',
  /** Hide these user ids from results (e.g. already added to a list). */
  excludeUserIds = [],
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const runSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/users/search', {
        params: { q: trimmed, limit: 15, page: 1 },
      });
      const list = Array.isArray(data?.users) ? data.users : [];
      setResults(Array.isArray(list) ? list : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const visibleResults = results.filter((u) => !excludeUserIds.includes(u.id));

  return (
    <div className={`relative ${className}`}>
      <input
        type="search"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 text-sm text-slate-900 dark:text-slate-100"
        autoComplete="off"
      />
      {open && query.trim().length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg text-sm">
          {loading && (
            <li className="px-3 py-2 text-slate-500">Searching…</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-slate-500">No users found</li>
          )}
          {!loading && results.length > 0 && visibleResults.length === 0 && (
            <li className="px-3 py-2 text-slate-500">Everyone matching is already added</li>
          )}
          {!loading &&
            visibleResults.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelectUser?.(u);
                    setQuery('');
                    setResults([]);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{u.name || u.email}</span>
                  {u.name && <span className="block text-xs text-slate-500">{u.email}</span>}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
