import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function GroupJoin() {
  const navigate = useNavigate();
  const params = useQueryParams();
  const token = params.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.post('/groups/join-by-token', { token });
        if (cancelled) return;
        const groupId = data.groupId;
        if (groupId) {
          navigate(`/groups/${groupId}`, { replace: true });
        } else {
          navigate('/groups', { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Failed to join group');
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Join Study Group"
        subtitle="Validating your invite and enrolling you in the selected group."
        className="mb-4"
      />
      <Card className="py-10 text-center">
        {loading ? (
          <div className="space-y-3">
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Joining group…</div>
            <div className="text-slate-500 dark:text-slate-400 text-sm">Validating invite link and adding you as a member.</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Couldn’t join</div>
            <div className="text-slate-600 dark:text-slate-400 text-sm">{error}</div>
            <Button variant="secondary" onClick={() => navigate('/groups')}>
              Back to groups
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

