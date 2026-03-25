import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

function StarRow({ value }) {
  const rounded = Math.round(value);
  return (
    <div className="text-amber-500 text-sm" aria-label={`Rating ${value} out of 5`}>
      {'★'.repeat(rounded)}
      <span className="text-slate-300 dark:text-slate-600">{'★'.repeat(Math.max(0, 5 - rounded))}</span>
    </div>
  );
}

function hashToRating(input) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  const base = 3.8 + (h % 13) / 20; // 3.8 .. 4.45
  return Math.min(5, Math.round(base * 10) / 10);
}

export default function TutorCard({ tutor, onSelect, selecting }) {
  const rating = useMemo(() => hashToRating(String(tutor?.id || tutor?.email || 'tutor')), [tutor]);
  const subjects = tutor?.subjects?.length ? tutor.subjects.join(', ') : '—';
  const experienceYears = useMemo(() => {
    const created = tutor?.created_at ? new Date(tutor.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) return 1;
    const years = Math.max(1, Math.floor((Date.now() - created.getTime()) / (365 * 24 * 3600 * 1000)));
    return years;
  }, [tutor]);

  const name = tutor?.display_name || tutor?.name || tutor?.email || 'Tutor';
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
          <StarRow value={rating} />
          <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <div>Subject: {subjects}</div>
            <div>Experience: {experienceYears} {experienceYears === 1 ? 'year' : 'years'}</div>
          </div>
        </div>
        <div className="shrink-0">
          <Button onClick={onSelect} disabled={selecting} loading={selecting}>
            Select Tutor
          </Button>
        </div>
      </div>
    </Card>
  );
}

