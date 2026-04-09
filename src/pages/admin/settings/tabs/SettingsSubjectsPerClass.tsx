import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { isALevelClass, isOLevelClass } from '@/components/reports/templates/helpers';
import SettingsUaceClassSubjectPapers from '@/components/admin/SettingsUaceClassSubjectPapers';
import {
  canRemoveClassSubjectRow,
  classSubjectBadge,
  enrichClassSubjectsWithUaceCatalog,
  isUacePrincipalCatalogSubject,
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
      <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">No subjects in this list yet.</div>
    );
  }
  return (
    <>
      <ul className="divide-y divide-slate-200/35 dark:divide-white/10 sm:hidden">
        {rows.map((row) => {
          const badge = classSubjectBadge(row, selectedClass);
          const rem = canRemoveClassSubjectRow(selectedClass, row);
          return (
            <li key={row.subject} className="px-3 py-3.5">
              <div className="ac-text-primary text-[15px] font-semibold leading-snug break-words">{row.subject}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {badge ? (
                  <span className="rounded-md border border-[var(--pw-border)] bg-[var(--pw-s2)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--pw-muted)]">
                    {badge}
                  </span>
                ) : null}
                {!rem && (
                  <span className="text-xs text-[var(--pw-muted)]" title="Cannot remove this slot">
                    locked
                  </span>
                )}
              </div>
              {rem ? (
                <button
                  type="button"
                  onClick={() => onRemove(row)}
                  className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-rose-600/90 px-4 text-sm font-semibold text-white hover:bg-rose-500 active:bg-rose-700"
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
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
              const badge = classSubjectBadge(row, selectedClass);
              const rem = canRemoveClassSubjectRow(selectedClass, row);
              return (
                <tr key={row.subject} className="border-t border-slate-200/25 dark:border-white/10">
                  <td className="max-w-[12rem] px-4 py-2.5 ac-text-primary font-medium break-words md:max-w-none">
                    {row.subject}
                  </td>
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
                        className="min-h-[40px] min-w-[5.5rem] rounded-lg bg-rose-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
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
    </>
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
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug ac-text-primary">Compulsory subjects</div>
            <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
              UCE core for this class — learners must include all of these.
            </div>
          </div>
          <SubjectRowsTable rows={compulsory} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug ac-text-primary">Subsidiary subjects</div>
            <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
              Optional pool — learners choose from this list (rules apply in Senior 3–4).
            </div>
          </div>
          <SubjectRowsTable rows={subsidiary} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
      </div>
      {other.length > 0 && (
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug ac-text-primary">Unclassified</div>
            <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
              No compulsory/subsidiary tag — remove and re-add using the checkbox above, or fix data in the database.
            </div>
          </div>
          <SubjectRowsTable rows={other} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
      )}
    </div>
  );
}

function ALevelSubjectSplitTables({
  selectedClass,
  subjectRows,
  onRemove,
}: {
  selectedClass: string;
  subjectRows: ClassSubjectRow[];
  onRemove: (row: ClassSubjectRow) => void;
}) {
  const principal = subjectRows.filter((r) => r.uace_catalog_type === 'principal');
  const subsidiary = subjectRows.filter((r) => r.uace_catalog_type === 'subsidiary');
  const other = subjectRows.filter(
    (r) => r.uace_catalog_type !== 'principal' && r.uace_catalog_type !== 'subsidiary',
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug ac-text-primary">Principal subjects</div>
            <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
              UACE principal pool — schools may add or remove principals (must match national catalog names). Learners
              take up to three.
            </div>
          </div>
          <SubjectRowsTable rows={principal} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug ac-text-primary">Subsidiary subjects</div>
            <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
              Nationwide UACE subsidiaries — fixed catalog list for this class. Cannot be removed or renamed here.
            </div>
          </div>
          <SubjectRowsTable rows={subsidiary} selectedClass={selectedClass} onRemove={onRemove} />
        </div>
      </div>
      {other.length > 0 && (
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug ac-text-primary">Unclassified</div>
            <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
              Not found as principal or subsidiary in the UACE catalog — check spelling or remove.
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
      <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
        <div className="text-[15px] font-semibold leading-snug ac-text-primary">{title}</div>
        <div className="mt-1 text-xs leading-relaxed ac-text-secondary">{selectedClass}</div>
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

  const { data: uaceCatalog = [] } = useQuery({
    queryKey: ['public', 'uace_subject_catalog'],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('uace_subject_catalog')
        .select('subject_name, subject_type')
        .order('subject_name');
      if (qErr) throw qErr;
      return data || [];
    },
    staleTime: STALE_TIME_MS,
  });

  const displayRows = useMemo(
    () => enrichClassSubjectsWithUaceCatalog(subjectRows, selectedClass, uaceCatalog),
    [subjectRows, selectedClass, uaceCatalog],
  );

  const loading = isLoading;

  const addSubject = async () => {
    setError(null);
    if (!schoolId || !selectedClass) return;
    const s = newSubject.trim();
    if (!s) return;
    if (subjectRows.some((r) => r.subject === s)) return;
    if (isALevelClass(selectedClass) && !isUacePrincipalCatalogSubject(s, uaceCatalog)) {
      setError(
        'Senior 5–6: only UACE principal subjects from the national catalog can be added. Subsidiary lines are fixed — schools cannot add new subsidiary subjects.',
      );
      return;
    }
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
        desc="Senior 1–4: default compulsory rows are locked; add optional compulsory or subsidiary. Senior 5–6: principals vs subsidiaries mirror O-Level layout; only principals can be added; subsidiaries are catalog-fixed."
      />
      <div className={`${settingsInsetSurface} space-y-4 p-3 sm:p-5`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="ac-input min-h-[48px] w-full lg:max-w-none"
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
          placeholder={
            isALevelClass(selectedClass)
              ? 'Add principal subject (exact UACE catalog name)'
              : 'Add subject (e.g., Mathematics)'
          }
          className="ac-input min-h-[48px] w-full"
        />
        <button
          type="button"
          disabled={!selectedClass || saving}
          onClick={addSubject}
          className={`${settingsPrimaryActionClass} sm:col-span-2 lg:col-span-1`}
        >
          {saving ? 'Saving...' : 'Add Subject'}
        </button>
        {isOLevelClass(selectedClass) && (
          <label className="flex min-h-[48px] cursor-pointer items-start gap-3 text-sm leading-snug ac-text-secondary sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              checked={addAsCompulsory}
              onChange={(e) => setAddAsCompulsory(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 rounded border-[var(--pw-border)]"
              aria-label="Add as compulsory UCE subject"
            />
            <span>Add as compulsory UCE (otherwise subsidiary)</span>
          </label>
        )}
        {isALevelClass(selectedClass) && (
          <p className="text-xs leading-relaxed ac-text-secondary sm:col-span-2 lg:col-span-3">
            Senior 5–6: new rows must be UACE <strong className="font-medium ac-text-primary">principal</strong> catalog
            subjects only. Subsidiaries are seeded from the national list and cannot be added here.
          </p>
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
        ) : isALevelClass(selectedClass) ? (
          <ALevelSubjectSplitTables
            selectedClass={selectedClass}
            subjectRows={displayRows}
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
      {classOptions.some((c) => isALevelClass(c)) && isALevelClass(selectedClass) && schoolId ? (
        <SettingsUaceClassSubjectPapers
          embedded
          anchorClassName={selectedClass}
          classOptions={classOptions}
          schoolId={schoolId}
        />
      ) : null}
    </div>
  );
}
