import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import QuizGeneratorModal from './QuizGeneratorModal';
import QuizTakeModal from './QuizTakeModal';

export default function GroupQuizzes({ groupId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [takeQuizId, setTakeQuizId] = useState(null);

  const isTutor = user?.roleName === 'tutor';

  const loadQuizzes = useCallback(() => {
    setLoading(true);
    api.get(`/groups/${groupId}/quizzes`, { skipGlobalErrorToast: true })
      .then(({ data }) => setQuizzes(Array.isArray(data) ? data : []))
      .catch((err) => {
        // Ignore 403 or 404 silently if not applicable
        if (err.response?.status !== 403) {
          console.error(err);
        }
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="font-semibold text-lg text-slate-900 dark:text-slate-100">AI Quizzes</h2>
        {isTutor && (
          <Button size="sm" onClick={() => setGeneratorOpen(true)}>
            Generate AI Quiz ✨
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">No quizzes available for this group.</p>
      ) : (
        <div className="space-y-3">
          {quizzes.map(q => (
            <div key={q.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">{q.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {q.question_count} questions • From: {q.document_name}
                </p>
                {q.score !== null && q.score !== undefined && (
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    Your Score: {q.score} / {q.total}
                  </p>
                )}
              </div>
              <div>
                {!isTutor && (
                  <Button
                    size="sm"
                    variant={q.score !== null && q.score !== undefined ? 'secondary' : 'primary'}
                    onClick={() => setTakeQuizId(q.id)}
                  >
                    {q.score !== null && q.score !== undefined ? 'View Results' : 'Take Quiz'}
                  </Button>
                )}
                {isTutor && (
                  <Button size="sm" variant="secondary" onClick={() => setTakeQuizId(q.id)}>
                    View Quiz
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {generatorOpen && (
        <QuizGeneratorModal
          groupId={groupId}
          onClose={() => setGeneratorOpen(false)}
          onSuccess={() => {
            setGeneratorOpen(false);
            loadQuizzes();
          }}
        />
      )}

      {takeQuizId && (
        <QuizTakeModal
          groupId={groupId}
          quizId={takeQuizId}
          onClose={() => {
            setTakeQuizId(null);
            loadQuizzes();
          }}
        />
      )}
    </Card>
  );
}
