import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import PageHeader from '../../components/ui/PageHeader';

export default function AIChatPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [aiStatusLoading, setAiStatusLoading] = useState(true);
  const [providerOrder, setProviderOrder] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/ai/status', { skipGlobalErrorToast: true })
      .then(({ data }) => {
        if (!cancelled) {
          setAiConfigured(!!data?.configured);
          setProviderOrder(Array.isArray(data?.order) ? data.order : []);
        }
      })
      .catch(() => {
        if (!cancelled) setAiConfigured(false);
      })
      .finally(() => {
        if (!cancelled) setAiStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      const { data } = await api.post('/ai/chat', { message: text }, { skipGlobalErrorToast: true });
      const reply = data?.reply ?? '';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply || '(No response)' }]);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || 'Could not reach the AI assistant.';
      if (status === 429) toast.warning(msg);
      else if (status === 502 || status === 503) toast.warning(msg);
      else toast.error(msg);
      setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
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
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <PageHeader
              title="Growe Assistant"
              subtitle="Academic guidance for coursework, planning, and collaborative workflows."
              actions={(
                <Button type="button" variant="secondary" size="sm" onClick={clearChat} disabled={messages.length === 0 && !loading}>
                  Clear chat
                </Button>
              )}
            />
            {aiConfigured && providerOrder.length > 0 && (
              <p className="mt-1 text-[11px] font-normal text-slate-400 dark:text-slate-500">
                Providers: {providerOrder.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' → ')}
              </p>
            )}
          </div>

          {!aiStatusLoading && !aiConfigured && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">AI assistant is not configured on the server</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-200/95">
                Add <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900/80">GROQ_API_KEY</code> (free tier),{' '}
                <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900/80">OPENAI_API_KEY</code>, or{' '}
                <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900/80">GEMINI_API_KEY</code> to{' '}
                <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900/80">growe-backend/.env</code>, then restart the API.
                See <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900/80">growe-backend/.env.example</code>.
              </p>
            </div>
          )}

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
                    Growe is typing…
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <ChatInput
            onSend={handleSend}
            disabled={loading || !aiConfigured || aiStatusLoading}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
