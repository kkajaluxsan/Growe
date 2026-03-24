const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function Avatar({ src, name, email, size = 'md', className = '' }) {
  const initial = (name || email || '?').trim().charAt(0).toUpperCase() || '?';
  const sz = sizes[size] || sizes.md;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${sz} rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-800 shadow-sm ${className}`}
      />
    );
  }

  return (
    <span
      className={`${sz} rounded-full shrink-0 flex items-center justify-center font-semibold text-slate-800 bg-gradient-to-br from-growe/40 to-growe/80 ring-2 ring-white dark:ring-slate-800 shadow-sm ${className}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
