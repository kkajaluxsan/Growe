export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none active:scale-[0.99]';
  const variants = {
    primary:
      'bg-growe text-slate-900 hover:bg-growe-light focus:ring-growe-dark shadow-[0_7px_16px_rgba(46,232,160,0.24)] hover:shadow-[0_10px_20px_rgba(46,232,160,0.3)]',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-[0_8px_20px_rgba(5,150,105,0.24)]',
    secondary:
      'bg-white text-slate-800 border border-slate-200 hover:bg-slate-100 focus:ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 shadow-sm hover:shadow-md',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-[0_8px_20px_rgba(220,38,38,0.24)]',
    warning:
      'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 shadow-[0_8px_20px_rgba(245,158,11,0.24)]',
    ghost:
      'shadow-none hover:shadow-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400 text-slate-700 dark:text-slate-200',
  };
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
