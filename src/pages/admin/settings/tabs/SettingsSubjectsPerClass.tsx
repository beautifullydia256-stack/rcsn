import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchSubjectsPerClass(schoolId: string, selectedClass: string): Promise<string[]> {
  const { data, error: err } = await supabase
    .from('class_subjects')
    .select('subject')
    .eq('school_id', schoolId)
    .eq('class_name', selectedClass)
    .order('subject');
  if (err) throw err;
  return (data || []).map((r: { subject: string }) => r.subject);
}

export default function SettingsSubjectsPerClass({
  classOptions,
  schoolId,
}: {
  classOptions: string[];
  schoolId: string | null;
}) {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId, selectedClass],
    queryFn: () => fetchSubjectsPerClass(schoolId!, selectedClass),
    enabled: !!schoolId && !!selectedClass,
    staleTime: STALE_TIME_MS,
  });

  const loading = isLoading;

  const addSubject = async () => {
    setError(null);
    if (!schoolId || !selectedClass) return;
    const s = newSubject.trim();
    if (!s) return;
    if (subjects.includes(s)) return;
    setSaving(true);
    const { error: insertError } = await supabase
      .from('class_subjects')
      .insert({ school_id: schoolId, class_name: selectedClass, subject: s });
    setSaving(false);
    if (insertError) {
      setError(insertError.message || 'Failed to add subject');
      return;
    }
    setNewSubject('');
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId, selectedClass] });
  };

  const removeSubject = async (subj: string) => {
    setError(null);
    if (!schoolId || !selectedClass) return;
    const { error: err } = await supabase
      .from('class_subjects')
      .delete()
      .eq('school_id', schoolId)
      .eq('class_name', selectedClass)
      .eq('subject', subj);
    if (err) {
      setError(err.message || 'Failed to remove subject');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId, selectedClass] });
  };

  return (
    <div>
      <SectionHeader
        title="Subjects per Class"
        desc="Manage the list of subjects taught in each class/grade."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="ac-input min-h-[44px] w-full md:w-64"
        >
          <option value="">Select Class</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Add subject (e.g., Mathematics)"
          className="ac-input min-h-[44px] w-full"
        />
        <button
          type="button"
          disabled={!selectedClass || saving}
          onClick={addSubject}
          className="min-h-[44px] rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add Subject'}
        </button>
      </div>
      <div className="mt-4">
        {error && (
          <div className="mb-2 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-sm ac-text-secondary">Loading subjects...</div>
        ) : !selectedClass ? (
          <div className="text-sm ac-text-secondary">Select a class to view its subjects.</div>
        ) : subjects.length === 0 ? (
          <div className="text-sm ac-text-secondary">
            No subjects yet for {selectedClass}. Add one above.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span
                key={s}
                className="flex gap-2 rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] px-3 py-1.5 text-sm ac-text-primary"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSubject(s)}
                  className="text-rose-300 hover:text-rose-100"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
