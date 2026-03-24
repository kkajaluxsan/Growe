import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AssignmentList() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = statusFilter ? { status: statusFilter } : {};
    api.get('/assignments', { params })
      .then(({ data }) => setAssignments(data))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800" />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <Link to="/assignments/new" className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700">
          Add Assignment
        </Link>
      </div>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded py-2 px-3"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
      <div className="space-y-4">
        {assignments.length === 0 ? (
          <p className="text-gray-600">No assignments. Add one to get started.</p>
        ) : (
          assignments.map((a) => (
            <div key={a.id} className="p-4 bg-white rounded-lg shadow flex justify-between items-center">
              <div>
                <h2 className="font-semibold">{a.title}</h2>
                <p className="text-sm text-gray-600">{a.status} • Priority {a.priority}</p>
                {a.deadline && <p className="text-xs text-gray-500">Due: {new Date(a.deadline).toLocaleDateString()}</p>}
              </div>
              <div className="flex gap-2">
                <Link to={`/assignments/${a.id}`} className="text-slate-600 hover:underline">Edit</Link>
                <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
