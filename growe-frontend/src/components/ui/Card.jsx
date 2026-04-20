export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white/95 shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all duration-200 dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-[0_10px_24px_rgba(2,6,23,0.42)] ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div>
        {title && <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 font-serif">{title}</h2>}
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
