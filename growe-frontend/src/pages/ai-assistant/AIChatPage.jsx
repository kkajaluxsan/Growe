import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function AIChatPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleSend = async (text) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message: text });
      const reply = data?.reply ?? '';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply || '(No response)' }]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not reach the AI assistant.';
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry — something went wrong. ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-800/50 md:h-[calc(100vh-7rem)]">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Future: session history */}
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40 md:flex md:flex-col">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">History</h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Saved conversations will appear here in a future update.</p>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Assistant</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Academic help for your GROWE workspace</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={clearChat} disabled={messages.length === 0 && !loading}>
              Clear chat
            </Button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
            {messages.length === 0 && !loading && (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Ask me anything</p>
                <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                  Study tips, scheduling, or how to use groups and meetings — I&apos;m here to help.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} onCopy={m.role === 'assistant' ? handleCopy : undefined} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 shadow-md dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-growe-dark/80" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-growe-dark/80" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-growe-dark/80" style={{ animationDelay: '300ms' }} />
                    </span>
                    AI is typing…
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
