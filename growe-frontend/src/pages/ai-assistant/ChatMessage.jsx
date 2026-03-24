import Button from '../../components/ui/Button';

export default function ChatMessage({ role, content, onCopy }) {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 shadow-md transition-all duration-200 ${
          isUser
            ? 'bg-growe text-slate-900'
            : 'border border-slate-200 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        {!isUser && onCopy && (
          <div className="mt-2 flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="!shadow-none !py-1 text-xs" onClick={() => onCopy(content)}>
              Copy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
