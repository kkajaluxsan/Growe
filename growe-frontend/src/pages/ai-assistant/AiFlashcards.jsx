import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function AiFlashcards() {
  const [topic, setTopic] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    
    setLoading(true);
    setFlashcards([]);
    try {
      const { data } = await api.post('/ai/flashcards', { topic });
      if (data.flashcards && Array.isArray(data.flashcards)) {
        // add flipped state to each card
        setFlashcards(data.flashcards.map(c => ({ ...c, flipped: false })));
        toast.success('Flashcards generated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlip = (index) => {
    setFlashcards(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], flipped: !copy[index].flipped };
      return copy;
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <span className="text-4xl">🧠</span> AI Smart Flashcards
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Enter any topic you want to master, and our AI will generate a set of interactive study cards for you instantly!
        </p>
      </div>

      <Card className="mb-8 p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border-indigo-100 dark:border-slate-700">
        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label htmlFor="topic" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              What do you want to learn today?
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. History of Rome, Mitosis, Newton's Laws..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 placeholder-slate-400 transition-all"
              disabled={loading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={loading || !topic.trim()} 
            className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transform transition active:scale-95"
          >
            {loading ? 'Generating...' : 'Generate Cards'}
          </Button>
        </form>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">Consulting the AI Oracle...</p>
        </div>
      )}

      {!loading && flashcards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 perspective-[1000px]">
          {flashcards.map((card, idx) => (
            <div 
              key={idx} 
              className="relative w-full h-64 cursor-pointer group"
              onClick={() => toggleFlip(idx)}
              style={{ perspective: '1000px' }}
            >
              <div 
                className="w-full h-full duration-500 ease-in-out relative"
                style={{ 
                  transformStyle: 'preserve-3d', 
                  transform: card.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                }}
              >
                {/* Front side (Question) */}
                <div 
                  className="absolute w-full h-full rounded-2xl shadow-lg border-2 border-indigo-50/50 bg-white dark:bg-slate-800 p-6 flex flex-col items-center justify-center text-center inset-0"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="absolute top-4 left-4 text-xs font-bold text-indigo-400">Q.</span>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{card.q}</h3>
                  <p className="absolute bottom-4 text-xs text-slate-400">Click to flip</p>
                </div>

                {/* Back side (Answer) */}
                <div 
                  className="absolute w-full h-full rounded-2xl shadow-lg border-2 border-emerald-100/50 bg-emerald-50 dark:bg-emerald-900/30 p-6 flex flex-col items-center justify-center text-center inset-0"
                  style={{ 
                    backfaceVisibility: 'hidden', 
                    transform: 'rotateY(180deg)' 
                  }}
                >
                  <span className="absolute top-4 left-4 text-xs font-bold text-emerald-500">A.</span>
                  <div className="overflow-y-auto max-h-full scrollbar-hide py-2 text-slate-700 dark:text-emerald-100/90 text-sm font-medium">
                    {card.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && flashcards.length === 0 && topic && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">Hit Generate to build your flashcard deck.</p>
        </div>
      )}
    </div>
  );
}
