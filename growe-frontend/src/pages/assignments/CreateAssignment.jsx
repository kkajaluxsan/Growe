import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function CreateAssignment() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pending');
  const [priority, setPriority] = useState(2);
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/assignments', {
        title,
        description: description || undefined,
        status,
        priority,
        deadline: deadline || undefined,
      });
      navigate('/assignments');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Add Assignment</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow rounded p-6">
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded py-2 px-3"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded py-2 px-3"
            rows={3}
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded py-2 px-3"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Priority (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10))}
              className="w-full border rounded py-2 px-3"
            />
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Deadline</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full border rounded py-2 px-3"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create'}
        </button>
      </form>
    </div>
  );
}
