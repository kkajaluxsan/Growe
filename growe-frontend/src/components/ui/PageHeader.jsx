export default function PageHeader({
  title,
  subtitle,
  actions = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200/80 dark:border-slate-700 pb-4 ${className}`}>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500 dark:text-slate-400 mb-1">
          GROWE Academic Portal
        </p>
        <h1 className="ui-page-title truncate">{title}</h1>
        {subtitle ? <p className="ui-page-subtitle mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
>>>>>>> cf19c28 (Initial commit - UI updated)
