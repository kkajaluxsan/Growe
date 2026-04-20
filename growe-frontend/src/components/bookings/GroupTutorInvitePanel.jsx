import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';

/**
 * Pending study-group tutor invites (separate from booking rows until accepted).
 */
export default function GroupTutorInvitePanel({
  invites = [],
  loading = false,
  onAccept,
  onDecline,
  actingId = null,
}) {
  if (loading) {
    return (
      <Card className="p-6 mb-6">
        <CardHeader
          title="Study group tutor requests"
          subtitle="When a student invites you from group creation, it appears here — not in the booking table until you accept."
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </Card>
    );
  }

  if (!invites.length) {
    return (
      <Card className="p-6 mb-6">
        <CardHeader
          title="Study group tutor requests"
          subtitle="When a student invites you from group creation, it appears here — not in the booking table until you accept."
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">No pending group requests.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6 border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/20">
      <CardHeader
        title="Study group tutor requests"
        subtitle="Accept to join the group and confirm the session. These are not listed as regular bookings yet."
      />
      <ul className="space-y-3 mt-3">
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60"
          >
            <div className="text-sm min-w-0">
              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {inv.group_name || 'Study group'}
              </div>
              <div className="text-slate-600 dark:text-slate-400 mt-1">
                From {inv.requester_display_name || inv.requester_email}
                {inv.slot_start
                  ? ` · ${new Date(inv.slot_start).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}`
                  : ''}
              </div>
              {inv.subject ? <div className="text-xs text-slate-500 mt-1">Subject: {inv.subject}</div> : null}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="danger"
                onClick={() => onDecline?.(inv)}
                disabled={actingId === inv.id}
              >
                Decline
              </Button>
              <Button
                size="sm"
                variant="success"
                onClick={() => onAccept?.(inv)}
                disabled={actingId === inv.id}
                loading={actingId === inv.id}
              >
                Accept
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
