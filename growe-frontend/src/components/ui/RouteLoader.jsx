export default function RouteLoader() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/95 px-5 py-3 text-sm font-medium text-slate-600 shadow-md dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-growe dark:border-slate-600 dark:border-t-growe" />
        Loading page...
      </div>
    </div>
  );
}