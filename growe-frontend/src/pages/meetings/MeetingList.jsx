import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import ShareButton from '../../components/ui/ShareButton';
import MeetingCalendar from './MeetingCalendar';

const viewTabs = [
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
];

export default function MeetingList() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  useEffect(() => {
    api.get('/meetings')
      .then(({ data }) => setMeetings(data))
      .finally(() => setLoading(false));
  }, []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meetings</h1>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5">
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === tab.id
                  ? 'bg-growe text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'calendar' ? (
        <MeetingCalendar />
      ) : (
        <>
          {loading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-growe" />
          ) : (
            <div className="grid gap-4">
              {meetings.length === 0 ? (
                <p className="text-slate-600 dark:text-slate-400">No meetings. Create one from a group or use the Calendar to schedule.</p>
              ) : (
                meetings.map((m) => (
                  <Card key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Link to={`/meetings/${m.id}`} className="flex-1 min-w-0">
                      <h2 className="font-semibold text-slate-900 dark:text-slate-100">{m.title}</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{m.group_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : new Date(m.created_at).toLocaleString()}
                      </p>
                    </Link>
                    <a
                      href={`${baseUrl}/meetings/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-growe hover:underline shrink-0"
                    >
                      Open link
                    </a>
                    <ShareButton
                      title={m.title}
                      shareText={`Join this meeting: ${m.title} on GROWE`}
                      url={`${baseUrl}/meetings/${m.id}`}
                      variant="secondary"
                      size="sm"
                    />
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
