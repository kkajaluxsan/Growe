export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-md hover:shadow-lg transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div>
        {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
