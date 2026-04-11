import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const defaultOptions = { duration: 4000, variant: 'default' };

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    const opts = { ...defaultOptions, ...options };
    setToasts((prev) => [...prev, { id, message, variant: opts.variant, duration: opts.duration }]);
    if (opts.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, opts.duration);
    }
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (msg, opts) => add(msg, opts),
    [add]
  );
  toast.success = (msg, opts) => add(msg, { ...opts, variant: 'success' });
  toast.error = (msg, opts) => add(msg, { ...opts, variant: 'error', duration: 6000 });
  toast.warning = (msg, opts) => add(msg, { ...opts, variant: 'warning' });

  useEffect(() => {
    // Global API error toasts (emitted by axios client).
    const handler = (e) => {
      const { status, message, data } = e.detail || {};
      if (!status) return;
      // Avoid spamming toasts for auth redirects; UI already handles those.
      if (status === 401) return;

      // Extract detailed error description if validation failed.
      const detailedMessage = (Array.isArray(data?.details) && data.details.length > 0)
        ? data.details[0] // Show the first specific error (e.g. "Invalid time")
        : (message || 'Request failed');

      if (status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
        toast.warning(detailedMessage || 'Please verify your email to unlock all features');
        return;
      }
      if (status === 403) {
        toast.warning(detailedMessage || 'Access denied');
        return;
      }
      if (status === 400 || status === 409) {
        toast.error(detailedMessage);
        return;
      }
      if (status === 429) {
        toast.warning(detailedMessage || 'Too many requests. Try again in a moment.');
        return;
      }
      // 502/503 often carry a specific message (e.g. AI not configured, upstream outage)
      if (status === 502 || status === 503) {
        toast.warning(detailedMessage || 'Service temporarily unavailable.');
        return;
      }
      if (status === 429) {
        toast.warning(message || 'Too many requests. Try again in a moment.');
        return;
      }
      // 502/503 often carry a specific message (e.g. AI not configured, upstream outage)
      if (status === 502 || status === 503) {
        toast.warning(message || 'Service temporarily unavailable.');
        return;
      }
      if (status >= 500) {
        toast.error(detailedMessage || 'Server error. Please try again.');
        return;
      }
    };
    window.addEventListener('api-error', handler);
    return () => window.removeEventListener('api-error', handler);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, toasts, remove }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

function ToastContainer() {
  const { toasts, remove } = useToast();
  if (!toasts.length) return null;

  const variantStyles = {
    default: 'bg-slate-800 text-white dark:bg-slate-700',
    success: 'bg-growe text-slate-900 shadow-md',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-600 text-white',
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg ${variantStyles[t.variant] || variantStyles.default} animate-in slide-in-from-right duration-200`}
          role="alert"
        >
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm font-medium">{t.message}</p>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="opacity-80 hover:opacity-100 shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
