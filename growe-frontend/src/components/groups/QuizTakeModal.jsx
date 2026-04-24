import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function QuizTakeModal({ groupId, quizId, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // Student view
  const [attempt, setAttempt] = useState(null);
  // Tutor view
  const [attempts, setAttempts] = useState([]);
  const [viewingAttempt, setViewingAttempt] = useState(null);
  
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const isTutor = user?.roleName === 'tutor';

  const loadQuiz = useCallback(() => {
    setLoading(true);
    api.get(`/groups/${groupId}/quizzes/${quizId}`, { skipGlobalErrorToast: true })
      .then(({ data }) => {
        setQuiz(data.quiz);
        setQuestions(data.questions);
        
        if (data.attempts) {
          setAttempts(data.attempts);
        } else {
          setAttempt(data.attempt);
          if (!data.attempt) {
            setAnswers(data.questions.map(q => ({ questionId: q.id, selectedIndex: null })));
          } else if (data.attempt.answers) {
            setAnswers(data.attempt.answers);
          }
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to load quiz');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [groupId, quizId, toast, onClose]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSelectOption = (questionId, index) => {
    if (attempt || viewingAttempt || isTutor) return; 
    setAnswers(prev => 
      prev.map(a => a.questionId === questionId ? { ...a, selectedIndex: index } : a)
    );
  };

  const handleSubmit = async () => {
    const unanswered = answers.filter(a => a.selectedIndex === null);
    if (unanswered.length > 0) {
      if (!window.confirm(`You have ${unanswered.length} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/groups/${groupId}/quizzes/${quizId}/submit`, { answers });
      setAttempt(data.attempt);
      setQuestions(data.questions);
      if (data.attempt.answers) {
        setAnswers(data.attempt.answers);
      }
      toast.success('Quiz submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !quiz) {
    return (
      <Modal open onClose={onClose} title="Loading Quiz..." size="xl">
        <div className="py-10 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800 dark:border-white"></div>
        </div>
      </Modal>
    );
  }

  // Active attempt for rendering questions (either the student's attempt, or the one the tutor is viewing)
  const activeAttempt = attempt || viewingAttempt;

  return (
    <Modal open onClose={onClose} title={quiz.title} size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        
        {isTutor && !viewingAttempt && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Student Results ({attempts.length})</h3>
            {attempts.length === 0 ? (
              <p className="text-sm text-slate-500">No students have taken this quiz yet.</p>
            ) : (
              <div className="grid gap-3">
                {attempts.map(att => (
                  <div key={att.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{att.display_name}</p>
                      <p className="text-xs text-slate-500">{att.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{att.score} / {att.total}</p>
                        <p className="text-xs text-slate-500">{new Date(att.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => {
                        setViewingAttempt(att);
                        if (att.answers) setAnswers(att.answers);
                      }}>
                        View Answers
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* If tutor is viewing an attempt, show a back button */}
        {isTutor && viewingAttempt && (
          <div className="mb-4 flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Viewing attempt by</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{viewingAttempt.display_name}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => {
              setViewingAttempt(null);
              setAnswers([]);
            }}>
              Back to Results
            </Button>
          </div>
        )}

        {/* Quiz questions render (for student taking it, student reviewing it, or tutor reviewing it) */}
        {(!isTutor || viewingAttempt) && (
          <>
            {activeAttempt ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
                  {isTutor ? "Student Score" : "Quiz Completed"}
                </h3>
                <p className="text-emerald-700 dark:text-emerald-300 mt-1">
                  {isTutor ? viewingAttempt.display_name : "You"} scored {activeAttempt.score} out of {activeAttempt.total}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Please answer all {questions.length} questions. You can only submit this quiz once.
                </p>
              </div>
            )}

            <div className="space-y-8 mt-6">
              {questions.map((q, i) => {
                const answer = answers.find(a => a.questionId === q.id);
                const isCorrect = activeAttempt && q.correct_index === answer?.selectedIndex;
                const isWrong = activeAttempt && q.correct_index !== answer?.selectedIndex && answer?.selectedIndex !== null && answer?.selectedIndex !== undefined;

                return (
                  <div key={q.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                      <span className="text-slate-500 mr-2">{i + 1}.</span> {q.question}
                    </h4>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answer?.selectedIndex === optIdx;
                        
                        let optionStyle = "border-slate-300 dark:border-slate-600 hover:border-growe dark:hover:border-growe hover:bg-growe/5 cursor-pointer";
                        
                        if (isSelected) {
                          optionStyle = "border-growe bg-growe/10 text-growe-dark font-medium";
                        }

                        if (activeAttempt) {
                          optionStyle = "border-slate-300 dark:border-slate-600 opacity-70 cursor-default";
                          if (q.correct_index === optIdx) {
                            optionStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium";
                          } else if (isSelected && !isCorrect) {
                            optionStyle = "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium line-through";
                          }
                        }

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`p-3 rounded-lg border transition-colors ${optionStyle}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-5 h-5 mt-0.5 rounded-full border flex-shrink-0 flex items-center justify-center
                                ${isSelected ? 'border-growe bg-growe' : 'border-slate-400'}
                                ${activeAttempt && q.correct_index === optIdx ? '!border-emerald-500 !bg-emerald-500' : ''}
                                ${activeAttempt && isSelected && !isCorrect ? '!border-red-500 !bg-red-500' : ''}
                              `}>
                                {((isSelected && !activeAttempt) || (activeAttempt && q.correct_index === optIdx)) && (
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                              </div>
                              <span>{opt}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {activeAttempt && q.explanation && (
                      <div className={`mt-4 p-3 rounded-lg text-sm border
                        ${isCorrect ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'}`
                      }>
                        <strong className="font-semibold">{isCorrect ? 'Correct! ' : 'Explanation: '}</strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
        {isTutor && !viewingAttempt ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : activeAttempt ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Answers'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
