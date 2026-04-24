import { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function QuizGeneratorModal({ groupId, onClose, onSuccess }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(5);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      return toast.error('Please enter a quiz title');
    }
    if (!file) {
      return toast.error('Please upload a document (.pdf or .docx)');
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title);
    formData.append('count', count);

    try {
      await api.post(`/groups/${groupId}/quizzes/generate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Quiz generated successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={!loading ? onClose : undefined} title="Generate AI Quiz" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload a study document and our AI will automatically read it and generate a multiple-choice quiz for the group.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Quiz Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 4: Networking Basics"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-growe"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Number of Questions
          </label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-growe"
            disabled={loading}
          >
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Study Material (PDF, DOCX, TXT)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt"
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-growe/10 file:text-growe-dark
              hover:file:bg-growe/20 dark:file:bg-growe/20 dark:hover:file:bg-growe/30
              cursor-pointer"
            disabled={loading}
          />
          {file && (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              Selected: {file.name}
            </p>
          )}
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Generating... (This may take a minute)
              </span>
            ) : (
              'Generate Quiz'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
