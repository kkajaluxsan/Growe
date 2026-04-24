import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function AiFlashcards() {
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState(null);
  const [count, setCount] = useState(10);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim() && !file) return;
    
    setLoading(true);
    setFlashcards([]);
    try {
      const formData = new FormData();
      if (topic.trim()) formData.append('topic', topic.trim());
      if (file) formData.append('document', file);
      formData.append('count', count);

      const { data } = await api.post('/ai/flashcards', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
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
          Growe Smart Flashcards
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Enter any topic you want to master, and our AI will generate a set of interactive study cards for you instantly!
        </p>
      </div>

      <Card className="mb-8 p-6 bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 border-emerald-100 dark:border-slate-700">
        <form onSubmit={handleGenerate} className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full relative">
              <label htmlFor="topic" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                What do you want to learn today?
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. History of Rome, Mitosis, Newton's Laws..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm focus:border-growe-dark focus:ring-growe-dark placeholder-slate-400 transition-all"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full relative">
              <label htmlFor="file-upload" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Or upload a document (PDF, TXT)
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.txt,.md"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-growe/20 file:text-growe-dark hover:file:bg-growe/30 transition-all dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-2 py-1.5"
                disabled={loading}
              />
            </div>
            
            <div className="w-full sm:w-32">
              <label htmlFor="flashcard-count" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 whitespace-nowrap">
                How many?
              </label>
              <input
                id="flashcard-count"
                type="number"
                min="1"
                max="50"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm focus:border-growe-dark focus:ring-growe-dark text-center transition-all"
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={loading || (!topic.trim() && !file)} 
              className="w-full sm:w-auto px-8 py-3 h-[50px] bg-growe hover:bg-growe-dark text-slate-900 font-semibold rounded-xl shadow-md transform transition active:scale-95"
            >
              {loading ? 'Generating...' : 'Generate Cards'}
            </Button>
          </div>
        </form>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-growe-dark rounded-full animate-spin"></div>
          <p className="text-growe-dark dark:text-growe-light font-medium animate-pulse">Consulting the AI Oracle...</p>
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
                  className="absolute w-full h-full rounded-2xl shadow-lg border-2 border-emerald-50/50 bg-white dark:bg-slate-800 p-6 flex flex-col items-center justify-center text-center inset-0"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="absolute top-4 left-4 text-xs font-bold text-emerald-400">Q.</span>
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
