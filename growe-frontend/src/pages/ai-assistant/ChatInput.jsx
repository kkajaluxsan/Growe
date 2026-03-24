import { useState, useRef, useEffect } from 'react';
import Button from '../../components/ui/Button';

export default function ChatInput({ onSend, disabled, placeholder = 'Message the assistant…' }) {
  const [value, setValue] = useState('');
  const taRef = useRef(null);

  useEffect(() => {
    if (!disabled && taRef.current) taRef.current.focus();
  }, [disabled]);

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
    if (taRef.current) {
      taRef.current.style.height = 'auto';
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-4xl gap-3">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[48px] max-h-40 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-growe focus:outline-none focus:ring-2 focus:ring-growe/40 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 transition-all duration-200"
        />
        <Button type="button" onClick={submit} disabled={disabled || !value.trim()} loading={disabled}>
          Send
        </Button>
      </div>
      <p className="mx-auto mt-2 max-w-4xl text-center text-xs text-slate-500 dark:text-slate-400">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
