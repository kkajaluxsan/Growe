export default function PageHeader({
  title,
  subtitle,
  actions = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-gray-200 pb-4 ${className}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-gray-400 mb-1">
          GROWE Academic Portal
        </p>

        {/* 🔥 GROWE style title FIXED */}
        <h1 className="truncate text-3xl font-extrabold">
          <span className="text-white">Pro</span>
          <span className="text-green-500">file</span>
        </h1>

        {subtitle ? (
          <p className="mt-1 text-sm text-gray-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}