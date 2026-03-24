import { useId } from 'react';

export default function Input({
  error,
  disabled,
  className = '',
  inputClassName = '',
  id,
  label,
  name,
  ...props
}) {
  const uid = useId();
  const inputId = id || name || uid;
  const base =
    'w-full rounded-2xl border bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all duration-200 ' +
    'focus:outline-none focus:ring-2 focus:ring-growe/50 focus:border-growe ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ';

  const borderState = error
    ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400'
    : 'border-slate-200 dark:border-slate-600';

  const control = (
    <input
      id={inputId}
      name={name}
      disabled={disabled}
      className={`${base} ${borderState} ${inputClassName}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${inputId}-error` : undefined}
      {...props}
    />
  );

  if (!label) {
    return (
      <div className={className}>
        {control}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      {control}
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
