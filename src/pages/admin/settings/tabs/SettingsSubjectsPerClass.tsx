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

function SubjectRowsTable({
  rows,
  selectedClass,
  onRemove,
}: {
  rows: ClassSubjectRow[];
  selectedClass: string;
  onRemove: (row: ClassSubjectRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm ac-text-secondary">No subjects in this list yet.</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200/30 text-left dark:border-white/10">
            <th className="px-4 py-2 ac-text-secondary">Subject</th>
            <th className="px-4 py-2 ac-text-secondary">Notes</th>
            <th className="px-4 py-2 ac-text-secondary w-[6.5rem]">Actions</th>
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(even)]:bg-slate-200/40 dark:[&>tr:nth-child(even)]:bg-white/5">
          {rows.map((row) => {
            const badge = classSubjectBadge(row);
            const rem = canRemoveClassSubjectRow(selectedClass, row);
            return (
              <tr key={row.subject} className="border-t border-slate-200/25 dark:border-white/10">
                <td className="px-4 py-2.5 ac-text-primary font-medium">{row.subject}</td>
                <td className="px-4 py-2.5">
                  {badge ? (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--pw-muted)]">{badge}</span>
                  ) : null}
                  {!rem && (
                    <span className="ml-2 text-xs text-[var(--pw-muted)]" title="Cannot remove this slot">
                      locked
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {rem ? (
                    <button
                      type="button"
                      onClick={() => onRemove(row)}
                      className="rounded-md bg-rose-600/90 px-2 py-1 text-xs font-medium text-white hover:bg-rose-500 transition-transform hover:scale-[1.02]"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--pw-muted)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OLevelSubjectSplitTables({
  selectedClass,
  subjectRows,
  onRemove,
}: {
  selectedClass: string;
  subjectRows: ClassSubjectRow[];
  onRemove: (row: ClassSubjectRow) => void;
}) {
  const compulsory = subjectRows.filter((r) => r.uce_offering_type === 'compulsory');
  const subsidiary = subjectRows.filter((r) => r.uce_offering_type === 'subsidiary');
  const other = subjectRows.filter(
    (r) => r.uce_offering_type !== 'compulsory' && r.uce_offering_type !== 'subsidiary',
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-4 py-3 dark:border-white/10">
            <div className="text-[15px] font-semibold ac-text-primary">Compulsory subjects</div>
            <div className="mt-0.5 text-xs ac-text-secondary">
              UCE core for this class — learners must include all of these.
            </div>
          </div>
          <SubjectRowsTable rows={compulsory} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-4 py-3 dark:border-white/10">
            <div className="text-[15px] font-semibold ac-text-primary">Subsidiary subjects</div>
            <div className="mt-0.5 text-xs ac-text-secondary">
              Optional pool — learners choose from this list (rules apply in Senior 3–4).
            </div>
          </div>
          <SubjectRowsTable rows={subsidiary} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
      </div>
      {other.length > 0 && (
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-4 py-3 dark:border-white/10">
            <div className="text-[15px] font-semibold ac-text-primary">Unclassified</div>
            <div className="mt-0.5 text-xs ac-text-secondary">
              No compulsory/subsidiary tag — remove and re-add using the checkbox above, or fix data in the database.
            </div>
          </div>
          <SubjectRowsTable rows={other} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
      )}
    </div>
  );
}

function AllSubjectsTableCard({
  title,
  selectedClass,
  subjectRows,
  onRemove,
}: {
  title: string;
  selectedClass: string;
  subjectRows: ClassSubjectRow[];
  onRemove: (row: ClassSubjectRow) => void;
}) {
  return (
    <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
      <div className="border-b border-slate-200/30 px-4 py-3 dark:border-white/10">
        <div className="text-[15px] font-semibold ac-text-primary">{title}</div>
        <div className="mt-0.5 text-xs ac-text-secondary">{selectedClass}</div>
      </div>
      <SubjectRowsTable rows={subjectRows} selectedClass={selectedClass} onRemove={onRemove} />
    </div>
  );
}

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
        ) : isOLevelClass(selectedClass) ? (
          <OLevelSubjectSplitTables
            selectedClass={selectedClass}
            subjectRows={subjectRows}
            onRemove={removeSubject}
          />
        ) : (
          <AllSubjectsTableCard
            title="Subjects for this class"
            selectedClass={selectedClass}
            subjectRows={subjectRows}
            onRemove={removeSubject}
          />
        )}
      </div>
      </div>
    </div>
  );
}
