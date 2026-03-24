import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';

export default function GroupList() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/groups')
      .then(({ data }) => setGroups(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load groups'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Study groups</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Collaborate with peers in shared spaces.</p>
        </div>
        <Button type="button" onClick={() => navigate('/groups/new')}>
          Create group
        </Button>
      </div>
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      {!groups.length ? (
        <Card className="text-center py-12 text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-200">No groups yet</p>
          <p className="text-sm mt-2">Create a group to start collaborating.</p>
          <Button type="button" className="mt-6" onClick={() => navigate('/groups/new')}>
            Create your first group
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:gap-6 md:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.id} className="flex flex-col h-full hover:border-growe/40 transition-all duration-200">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{g.name}</h2>
                {g.membership_status && (
                  <Badge variant={g.membership_status === 'approved' ? 'success' : 'warning'}>
                    {g.membership_status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex-1 line-clamp-3">
                {g.description || 'No description'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
                Up to {g.max_members ?? '—'} members
              </p>
              <div className="mt-4">
                <Link to={`/groups/${g.id}`}>
                  <Button variant="secondary" className="w-full sm:w-auto">
                    View
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
