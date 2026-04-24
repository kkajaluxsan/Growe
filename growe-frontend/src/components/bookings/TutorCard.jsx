import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

function StarRow({ value, count }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-1.5">
      <div className="text-amber-500 text-sm" aria-label={`Rating ${value} out of 5`}>
        {'★'.repeat(rounded)}
        <span className="text-slate-300 dark:text-slate-600">{'★'.repeat(Math.max(0, 5 - rounded))}</span>
      </div>
      {count > 0 && (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {value} ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      )}
      {count === 0 && (
        <span className="text-xs text-slate-400 dark:text-slate-500 italic">No reviews yet</span>
      )}
    </div>
  );
}

export default function TutorCard({ tutor, onSelect, selecting, hideSelectButton }) {
  const rating = tutor?.avg_rating || tutor?.avgRating || 0;
  const ratingCount = tutor?.rating_count || tutor?.ratingCount || 0;
  const subjects = tutor?.subjects?.length ? tutor.subjects.join(', ') : '—';

  const name = tutor?.display_name || tutor?.displayName || tutor?.name || 'Tutor';
  const initials = String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const avatarUrl =
    tutor?.profile_picture ||
    tutor?.profilePicture ||
    tutor?.avatar_url ||
    tutor?.avatarUrl ||
    '';

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${name} profile`}
            className="h-12 w-12 rounded-full object-cover bg-slate-200 dark:bg-slate-700"
            loading="lazy"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-semibold text-slate-700 dark:text-slate-200">
            {initials || 'T'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <StarRow value={rating} count={ratingCount} />
          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <div><span className="font-medium text-slate-700 dark:text-slate-300">Subject:</span> {subjects}</div>
            {(tutor?.years_experience > 0 || tutor?.experience_details) && (
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Experience{tutor?.years_experience > 0 ? ` (${tutor.years_experience} years)` : ''}:
                </span>{' '}
                {tutor?.experience_details || 'Experienced Tutor'}
              </div>
            )}
          </div>
        </div>
        {!hideSelectButton && (
          <div className="shrink-0">
            <Button onClick={onSelect} disabled={selecting} loading={selecting}>
              Select Tutor
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
