export default function TypingIndicator({ userId, participants }) {
  const name = participants?.find((p) => p.user_id === userId)?.display_name || participants?.find((p) => p.user_id === userId)?.email || 'Someone';
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
      <span className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-growe-dark/80 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-growe-dark/80 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-growe-dark/80 animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      <span>{name} is typing...</span>
    </div>
  );
}
