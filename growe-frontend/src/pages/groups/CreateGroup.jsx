import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState(10);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/groups', { name, description, maxMembers });
      navigate(`/groups/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Create Study Group</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow rounded p-6">
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Max Members</label>
          <input
            type="number"
            min={2}
            max={100}
            value={maxMembers}
            onChange={(e) => setMaxMembers(parseInt(e.target.value, 10))}
            className="w-full border rounded py-2 px-3"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </div>
  );
}
