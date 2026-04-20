import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import UserSearchDropdown from '../../components/common/UserSearchDropdown';
import TutorSelectionSection from '../../components/groups/TutorSelectionSection';

export default function CreateGroup() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sessionSubject, setSessionSubject] = useState('');
  const [maxMembers, setMaxMembers] = useState(10);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const excludeIds = useMemo(() => selectedMembers.map((m) => m.id), [selectedMembers]);

  const headcountAfterCreate = 1 + selectedMembers.length;

  const handleSelectUser = useCallback(
    (u) => {
      if (!u?.id) return;
      if (selectedMembers.some((m) => m.id === u.id)) return;
      if (headcountAfterCreate >= maxMembers) {
        toast.warning(
          `This group can have at most ${maxMembers} members (including you). Increase max members or remove someone.`
        );
        return;
      }
      setSelectedMembers((prev) => [
        ...prev,
        {
          id: u.id,
          email: u.email,
          name: u.name || u.email,
        },
      ]);
    },
    [selectedMembers, maxMembers, headcountAfterCreate, toast]
  );

  const remove = (id) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMaxChange = (e) => {
    const n = parseInt(e.target.value, 10);
    if (Number.isNaN(n)) return;
    setMaxMembers(n);
  };

  const handleMaxBlur = () => {
    if (maxMembers < headcountAfterCreate) {
      toast.warning(
        `Max members is ${maxMembers}. Remove ${headcountAfterCreate - maxMembers} invited ${headcountAfterCreate - maxMembers === 1 ? 'person' : 'people'} or raise the limit.`
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (maxMembers < 2 || maxMembers > 100) {
      setError('Max members must be between 2 and 100.');
      return;
    }
    if (maxMembers < headcountAfterCreate) {
      setError(
        `Max members (${maxMembers}) must be at least ${headcountAfterCreate} (you plus ${selectedMembers.length} invited).`
      );
      return;
    }
    if (selectedTutor && !selectedSlot) {
      setError('Choose a session time slot before inviting a tutor.');
      return;
    }
    if (selectedSlot?.start && new Date(selectedSlot.start).getTime() <= Date.now()) {
      setError('Session time must be in the future. Pick another date or slot.');
      return;
    }

    const tutorInvite =
      selectedTutor && selectedSlot
        ? {
            tutorUserId: selectedTutor.tutorUserId,
            availabilityId: selectedTutor.availabilityId,
            slotStart: selectedSlot.start,
            slotEnd: selectedSlot.end,
            subject: sessionSubject.trim() || undefined,
          }
        : undefined;

    setLoading(true);
    try {
      const { data: group } = await api.post('/groups', {
        name,
        description,
        maxMembers,
        ...(tutorInvite ? { tutorInvite } : {}),
      });
      const groupId = group?.id;
      if (!groupId) {
        setError('Group created but response was unexpected.');
        return;
      }

      let added = 0;
      const failed = [];
      for (const m of selectedMembers) {
        try {
          await api.post(`/groups/${groupId}/members`, { userId: m.id });
          added += 1;
        } catch (err) {
          const msg =
            err.response?.data?.error ||
            err.response?.data?.details?.join?.(', ') ||
            err.message ||
            'Failed';
          failed.push({ email: m.email, msg });
        }
      }

      if (tutorInvite) {
        toast.success('Group created. Tutor request sent — you’ll see pending approval on the group page.');
      } else if (selectedMembers.length === 0) {
        toast.success('Group created.');
      } else if (failed.length === 0) {
        toast.success(`Group created and ${added} ${added === 1 ? 'person' : 'people'} added.`);
      } else {
        toast.warning(
          `Group created. Added ${added} of ${selectedMembers.length}. ${failed.length} failed — you can add them from the group page.`
        );
      }
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create Study Group"
        subtitle="Set capacity, invite members, and optionally request a tutor for a scheduled session."
      />
      <form id="create-group-form" onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <div className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 text-sm">
              {error}
            </div>
          )}
          <div>
            <Input
              id="group-name"
              type="text"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="group-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 px-3 text-slate-900 dark:text-slate-100"
              rows={3}
            />
          </div>
          <div>
            <label
              htmlFor="session-subject"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Subject / focus (optional)
            </label>
            <Input
              id="session-subject"
              type="text"
              label="Subject / focus (optional)"
              value={sessionSubject}
              onChange={(e) => setSessionSubject(e.target.value)}
              placeholder="e.g. Calculus, essay writing…"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Used to prioritize tutors who list this topic. Leave empty for any subject.
            </p>
          </div>
          <div>
            <Input
              id="max-m"
              type="number"
              label="Max members (total)"
              min={2}
              max={100}
              value={maxMembers}
              onChange={handleMaxChange}
              onBlur={handleMaxBlur}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Includes you. After creation: {headcountAfterCreate} of {maxMembers} slots used
              {selectedMembers.length > 0 ? ' (invites below)' : ''}.
            </p>
          </div>

          <TutorSelectionSection
            subject={sessionSubject}
            onTutorChange={setSelectedTutor}
            onSlotChange={setSelectedSlot}
          />

          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Add people (optional)
            </span>
            <UserSearchDropdown
              disabled={loading}
              excludeUserIds={excludeIds}
              placeholder="Search by name or email…"
              onSelectUser={handleSelectUser}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Only verified users appear. You can add more later from the group page.
            </p>
            {selectedMembers.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <li
                    key={m.id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-sm text-slate-800 dark:text-slate-200"
                  >
                    <span className="truncate max-w-[12rem]">{m.name || m.email}</span>
                    <button
                      type="button"
                      onClick={() => remove(m.id)}
                      className="text-slate-500 hover:text-red-600 dark:hover:text-red-400 ml-0.5"
                      aria-label={`Remove ${m.email}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        </Card>

        <div className="pt-2 flex gap-3">
          <Button type="submit" loading={loading} disabled={loading}>
            {loading ? 'Creating…' : 'Create group'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={loading}>
            Cancel
          </Button>
        </div>
        </form>
    </div>
  );
}
