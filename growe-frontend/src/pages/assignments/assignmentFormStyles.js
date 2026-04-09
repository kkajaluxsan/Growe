/** Shared Tailwind classes for assignment create/edit forms */
export const fieldLabel = 'block text-sm font-medium text-slate-700 dark:text-slate-300';
export function fieldInputClass(invalid) {
  return `w-full rounded-xl border py-2.5 px-3 text-slate-900 transition-shadow dark:bg-slate-900 dark:text-slate-100 ${
    invalid
      ? 'border-red-500 ring-2 ring-red-500/20 focus:border-red-500 focus:ring-red-500/30'
      : 'border-slate-300 focus:border-growe focus:outline-none focus:ring-2 focus:ring-growe/30 dark:border-slate-600'
  }`;
}
