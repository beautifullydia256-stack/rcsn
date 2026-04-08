import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isOLevelClass } from '@/components/reports/templates/helpers';
import {
  canRemoveClassSubjectRow,
  classSubjectBadge,
  type ClassSubjectRow,
} from '@/lib/classSubjectRowGuards';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchSubjectsPerClass(schoolId: string, selectedClass: string): Promise<ClassSubjectRow[]> {
  const { data, error: err } = await supabase
    .from('class_subjects')
    .select('subject, uce_offering_type, is_non_removable_default')
    .eq('school_id', schoolId)
    .eq('class_name', selectedClass)
    .order('subject');
  if (err) throw err;
  return (data || []) as ClassSubjectRow[];
}

export default function SettingsSubjectsPerClass({
  classOptions,
  schoolId,
  embedded,
}: {
  classOptions: string[];
  schoolId: string | null;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [addAsCompulsory, setAddAsCompulsory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: subjectRows = [], isLoading } = useQuery({
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
    if (subjectRows.some((r) => r.subject === s)) return;
    setSaving(true);
    const payload: Record<string, unknown> = { school_id: schoolId, class_name: selectedClass, subject: s };
    if (isOLevelClass(selectedClass)) {
      payload.uce_offering_type = addAsCompulsory ? 'compulsory' : 'subsidiary';
      payload.is_non_removable_default = false;
    }
    const { error: insertError } = await supabase.from('class_subjects').insert(payload);
    setSaving(false);
    if (insertError) {
      setError(insertError.message || 'Failed to add subject');
      return;
    }
    setNewSubject('');
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId, selectedClass] });
  };

  const removeSubject = async (row: ClassSubjectRow) => {
    setError(null);
    if (!schoolId || !selectedClass) return;
    if (!canRemoveClassSubjectRow(selectedClass, row)) return;
    const { error: err } = await supabase
      .from('class_subjects')
      .delete()
      .eq('school_id', schoolId)
      .eq('class_name', selectedClass)
      .eq('subject', row.subject);
    if (err) {
      setError(err.message || 'Failed to remove subject');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId, selectedClass] });
  };

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        title="Subjects per Class"
        desc="Senior 1–4: default nationwide compulsory rows are locked; add optional compulsory or subsidiary. Senior 5–6: UACE subsidiaries are fixed."
      />
      <div className={`${settingsInsetSurface} space-y-4 p-4 sm:p-5`}>
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
          className={settingsPrimaryActionClass}
        >
          {saving ? 'Saving...' : 'Add Subject'}
        </button>
        {isOLevelClass(selectedClass) && (
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm ac-text-secondary md:col-span-3">
            <input
              type="checkbox"
              checked={addAsCompulsory}
              onChange={(e) => setAddAsCompulsory(e.target.checked)}
              className="rounded border-[var(--pw-border)]"
            />
            Add as compulsory UCE (otherwise subsidiary)
          </label>
        )}
      </div>
      <div>
        {error && (
          <div className="mb-2 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-sm ac-text-secondary">Loading subjects...</div>
        ) : !selectedClass ? (
          <div className="text-sm ac-text-secondary">Select a class to view its subjects.</div>
        ) : subjectRows.length === 0 ? (
          <div className="text-sm ac-text-secondary">
            No subjects yet for {selectedClass}. Add one above.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjectRows.map((row) => {
              const badge = classSubjectBadge(row);
              const rem = canRemoveClassSubjectRow(selectedClass, row);
              return (
                <span
                  key={row.subject}
                  className="flex gap-2 rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] px-3 py-1.5 text-sm ac-text-primary"
                >
                  {row.subject}
                  {badge && (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--pw-muted)]">{badge}</span>
                  )}
                  {!rem ? (
                    <span className="text-[var(--pw-muted)] text-xs" title="Cannot remove this slot">
                      locked
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeSubject(row)}
                      className="text-rose-300 hover:text-rose-100"
                      aria-label={`Remove ${row.subject}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
