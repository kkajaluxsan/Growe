/**
 * Circular control for meeting toolbar (icon-only + tooltip via title).
 */
export default function ControlButton({
  onClick,
  active = false,
  danger = false,
  label,
  disabled = false,
  children,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`
        flex h-12 w-12 shrink-0 items-center justify-center rounded-full
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-growe/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
        disabled:opacity-40 disabled:pointer-events-none
        ${danger ? 'bg-red-600 text-white shadow-lg hover:bg-red-500 hover:scale-105 active:scale-95' : ''}
        ${
          !danger
            ? active
              ? 'bg-growe/25 text-growe ring-1 ring-growe/50 hover:bg-growe/35'
              : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95'
            : ''
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
