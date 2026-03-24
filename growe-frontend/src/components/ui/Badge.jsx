export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200',
    success: 'bg-growe/20 text-emerald-900 dark:bg-growe/25 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  );
}
