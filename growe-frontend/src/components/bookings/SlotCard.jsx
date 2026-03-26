import React from 'react';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function SlotCard({ state, label, sublabel, onClick, disabled }) {
  const styles = {
    available:
      'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-500/60',
    booked:
      'bg-slate-200 border-slate-300 text-slate-500 dark:bg-slate-700/40 dark:border-slate-600 dark:text-slate-400',
    selected:
      'bg-blue-500/15 border-blue-500/50 text-blue-900 dark:text-blue-100 hover:bg-blue-500/20 hover:border-blue-500/70',
  };

  const isClickable = !disabled && state !== 'booked' && typeof onClick === 'function';

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={cx(
        'w-full rounded-xl border px-3 py-3 text-left transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-growe/40',
        styles[state] || styles.booked
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{label}</div>
          {sublabel && <div className="text-xs opacity-80 mt-1">{sublabel}</div>}
        </div>
        <div className="text-xs font-semibold shrink-0 uppercase tracking-wide opacity-80">
          {state === 'available' ? 'Available' : state === 'selected' ? 'Selected' : 'Booked'}
        </div>
      </div>
    </button>
  );
}

