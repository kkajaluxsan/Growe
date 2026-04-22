import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

function StarSelector({ value, onChange, disabled }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered ? star <= hovered : star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={`text-3xl transition-all duration-150 focus:outline-none disabled:cursor-not-allowed ${
              filled
                ? 'text-amber-400 scale-110 drop-shadow-sm'
                : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
            }`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            role="radio"
            aria-checked={star === value}
          >
            ★
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          {value}/5
        </span>
      )}
    </div>
  );
}

export default function RatingModal({ open, onClose, booking, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const api = (await import('../../services/api')).default;
      await api.post(`/bookings/${booking.id}/rate`, {
        rating: Number(rating),
        comment: comment.trim() || null,
      });
      onSubmitted?.();
      onClose();
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const tutorLabel = booking?.tutor_display_name || 'your tutor';
  const sessionDate = booking?.start_time
    ? new Date(booking.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';

  return (
    <Modal open={open} onClose={onClose} title="Rate Your Tutor">
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          {/* Session context */}
          <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-100">{tutorLabel}</span>
              {sessionDate && (
                <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Session: {sessionDate}
                </span>
              )}
            </div>
          </div>

          {/* Star selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              How would you rate this session?
            </label>
            <StarSelector value={rating} onChange={setRating} disabled={submitting} />
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="rating-comment"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Comment <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="rating-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              maxLength={1000}
              rows={3}
              placeholder="Share your experience..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-growe/50 focus:border-growe transition-all resize-none disabled:opacity-50"
            />
            <div className="text-right text-xs text-slate-400 mt-1">{comment.length}/1000</div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={rating < 1} loading={submitting}>
              Submit Rating
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
