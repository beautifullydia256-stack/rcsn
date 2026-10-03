import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '@/lib/supabase';
import { isALevelClass, isOLevelClass } from '@/components/reports/templates/helpers';
import TertiaryCohortPicker from '@/components/tertiary/TertiaryCohortPicker';
import { parseCohortKey, getUhpabDefaultUnitsForSemester } from '@/lib/tertiaryCurriculum';
import {
  canRemoveClassSubjectRow,
  classSubjectBadge,
  enrichClassSubjectsWithUaceCatalog,
  isUacePrincipalCatalogSubject,
  type ClassSubjectRow,
} from '@/lib/classSubjectRowGuards';
import {
  classNamesForProgrammeBand,
  fetchClassSubjectsForClasses,
  mergeBandClassSubjectRows,
  nonBandClassOptions,
  representativeClassNameForBand,
  type ProgrammeBand,
} from '@/lib/programmeBandClassSubjects';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

const STALE_TIME_MS = 5 * 60 * 1000;

function SubjectRowsTable({
  rows,
  selectedClass,
  onRemove,
  isTertiary,
}: {
  rows: ClassSubjectRow[];
  selectedClass: string;
  onRemove: (row: ClassSubjectRow) => void;
  isTertiary?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">
        {isTertiary ? 'No course units in this list yet.' : 'No subjects in this list yet.'}
      </div>
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
              <th className="px-4 py-2 ac-text-secondary">{isTertiary ? 'Course Unit / Module' : 'Subject'}</th>
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
  isTertiary,
}: {
  title: string;
  selectedClass: string;
  subjectRows: ClassSubjectRow[];
  onRemove: (row: ClassSubjectRow) => void;
  isTertiary?: boolean;
}) {
  return (
    <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
      <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
        <div className="text-[15px] font-semibold leading-snug ac-text-primary">{title}</div>
        <div className="mt-1 text-xs leading-relaxed ac-text-secondary">{selectedClass}</div>
      </div>
      <SubjectRowsTable rows={subjectRows} selectedClass={selectedClass} onRemove={onRemove} isTertiary={isTertiary} />
    </div>
  );
}

type SubjectSelection =
  | { mode: 'none' }
  | { mode: 'band'; band: ProgrammeBand }
  | { mode: 'single'; className: string };

function selectionSelectValue(s: SubjectSelection): string {
  if (s.mode === 'none') return '';
  if (s.mode === 'band') return `band:${s.band}`;
  return `single:${s.className}`;
}

function parseSubjectSelection(raw: string): SubjectSelection {
  if (!raw) return { mode: 'none' };
  if (raw === 'band:olevel') return { mode: 'band', band: 'olevel' };
  if (raw === 'band:alevel') return { mode: 'band', band: 'alevel' };
  if (raw.startsWith('single:')) return { mode: 'single', className: raw.slice(7) };
  return { mode: 'none' };
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
  const { isTertiary } = useSchoolType();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<SubjectSelection>({ mode: 'none' });
  const [newSubject, setNewSubject] = useState('');
  const [addAsCompulsory, setAddAsCompulsory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isTertiary && selection.mode === 'none') {
      setSelection({ mode: 'single', className: 'CN – Year 1 Semester 1' });
    }
  }, [isTertiary, selection.mode]);

  const preloadUhpabUnits = async () => {
    if (!schoolId || selection.mode !== 'single') return;
    const parsed = parseCohortKey(selection.className);
    if (!parsed.courseCode || !parsed.semesterCode) return;
    const defaultUnits = getUhpabDefaultUnitsForSemester(parsed.courseCode, parsed.semesterCode);
    if (defaultUnits.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const payload = defaultUnits.map((title) => ({
        school_id: schoolId,
        class_name: selection.className,
        subject: title,
      }));
      const { error: insErr } = await supabase.from('class_subjects').insert(payload);
      if (insErr) {
        setError(insErr.message || 'Failed to load UHPAB default units');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId] });
    } finally {
      setSaving(false);
    }
  };

  const olevelClassNames = useMemo(() => classNamesForProgrammeBand(classOptions, 'olevel'), [classOptions]);
  const alevelClassNames = useMemo(() => classNamesForProgrammeBand(classOptions, 'alevel'), [classOptions]);
  const otherClassNames = useMemo(() => nonBandClassOptions(classOptions), [classOptions]);

  const bandTargets =
    selection.mode === 'band'
      ? selection.band === 'olevel'
        ? olevelClassNames
        : alevelClassNames
      : [];
  const singleClassName = selection.mode === 'single' ? selection.className : '';
  const queryClassNames =
    selection.mode === 'band' ? bandTargets : selection.mode === 'single' ? [singleClassName] : [];

  const representativeClass =
    selection.mode === 'band'
      ? representativeClassNameForBand(bandTargets, selection.band)
      : selection.mode === 'single'
        ? singleClassName
        : '';

  const selectionKey = selectionSelectValue(selection);

  const { data: subjectRows = [], isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId, selectionKey, queryClassNames.join('|')],
    queryFn: async () => {
      const raw = await fetchClassSubjectsForClasses(schoolId!, queryClassNames);
      if (selection.mode === 'band') return mergeBandClassSubjectRows(raw);
      return raw.map((r) => ({
        subject: r.subject,
        uce_offering_type: r.uce_offering_type,
        is_non_removable_default: r.is_non_removable_default,
      })) as ClassSubjectRow[];
    },
    enabled: !!schoolId && queryClassNames.length > 0,
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
    enabled: !isTertiary,
    staleTime: STALE_TIME_MS,
  });

  const displayRows = useMemo(
    () => enrichClassSubjectsWithUaceCatalog(subjectRows, representativeClass, uaceCatalog),
    [subjectRows, representativeClass, uaceCatalog],
  );

  const loading = isLoading;

  const addSubject = async () => {
    setError(null);
    if (!schoolId || selection.mode === 'none') return;
    const s = newSubject.trim();
    if (!s) return;
    if (subjectRows.some((r) => String(r.subject).trim() === s)) return;

    if (!isTertiary && selection.mode === 'band' && selection.band === 'alevel' && !isUacePrincipalCatalogSubject(s, uaceCatalog)) {
      setError(
        'A-Level: only UACE principal subjects from the national catalog can be added. Subsidiary lines are fixed — schools cannot add new subsidiary subjects.',
      );
      return;
    }
    if (!isTertiary && selection.mode === 'single' && isALevelClass(selection.className) && !isUacePrincipalCatalogSubject(s, uaceCatalog)) {
      setError(
        'A-Level: only UACE principal subjects from the national catalog can be added. Subsidiary lines are fixed — schools cannot add new subsidiary subjects.',
      );
      return;
    }

    setSaving(true);
    try {
      if (selection.mode === 'band') {
        const targets =
          selection.band === 'olevel' ? olevelClassNames : alevelClassNames;
        if (targets.length === 0) {
          setError(
            selection.band === 'olevel'
              ? 'No O-Level classes found in your class list. Add Senior 1–4 (or equivalent) under Classes first.'
              : 'No A-Level classes found. Add Senior 5–6 (or equivalent) under Classes first.',
          );
          setSaving(false);
          return;
        }
        const raw = await fetchClassSubjectsForClasses(schoolId, targets);
        const have = new Set(
          raw.filter((r) => String(r.subject).trim() === s).map((r) => r.class_name),
        );
        const missing = targets.filter((c) => !have.has(c));
        if (missing.length === 0) {
          setSaving(false);
          return;
        }
        const rows = missing.map((class_name) => {
          const base: Record<string, unknown> = {
            school_id: schoolId,
            class_name,
            subject: s,
          };
          if (selection.band === 'olevel') {
            base.uce_offering_type = addAsCompulsory ? 'compulsory' : 'subsidiary';
            base.is_non_removable_default = false;
          }
          return base;
        });
        const { error: insertError } = await supabase.from('class_subjects').insert(rows);
        if (insertError) {
          setError(insertError.message || 'Failed to add course unit');
          setSaving(false);
          return;
        }
      } else {
        const cn = selection.className;
        const payload: Record<string, unknown> = { school_id: schoolId, class_name: cn, subject: s };
        if (!isTertiary && isOLevelClass(cn)) {
          payload.uce_offering_type = addAsCompulsory ? 'compulsory' : 'subsidiary';
          payload.is_non_removable_default = false;
        }
        const { error: insertError } = await supabase.from('class_subjects').insert(payload);
        if (insertError) {
          setError(insertError.message || 'Failed to add course unit');
          setSaving(false);
          return;
        }
      }
    } finally {
      setSaving(false);
    }
    setNewSubject('');
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId] });
  };

  const removeSubject = async (row: ClassSubjectRow) => {
    setError(null);
    if (!schoolId || selection.mode === 'none') return;
    if (!canRemoveClassSubjectRow(representativeClass, row)) return;
    let err: { message: string } | null = null;
    if (selection.mode === 'band') {
      const targets =
        selection.band === 'olevel' ? olevelClassNames : alevelClassNames;
      const { error: delErr } = await supabase
        .from('class_subjects')
        .delete()
        .eq('school_id', schoolId)
        .eq('subject', row.subject)
        .in('class_name', targets);
      err = delErr;
    } else {
      const { error: delErr } = await supabase
        .from('class_subjects')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_name', selection.className)
        .eq('subject', row.subject);
      err = delErr;
    }
    if (err) {
      setError(err.message || 'Failed to remove course unit');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'subjectsPerClass', schoolId] });
  };

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        title={isTertiary ? 'Course Units per Programme / Cohort' : 'Subjects per Class'}
        desc={
          isTertiary
            ? 'Manage course units, clinical modules, and papers taught across programmes and cohorts.'
            : 'Choose O-Level or A-Level to add or remove a subject for every class in that programme at once (the database keeps one class_subjects row per class, as before). Non-secondary classes still use a per-class option below.'
        }
      />
      <div className={`${settingsInsetSurface} space-y-4 p-3 sm:p-5`}>
      {isTertiary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <TertiaryCohortPicker
                selectedCohort={singleClassName}
                onChange={(cohort) =>
                  setSelection(cohort ? { mode: 'single', className: cohort } : { mode: 'none' })
                }
                layout="grid"
                showLabels
                programmeLabel="Programme"
                semesterLabel="Year & Semester"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold ac-text-secondary">
                Course Unit Title
              </label>
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Pharmacology, Medical Nursing"
                className="ac-input min-h-[44px] w-full"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={selection.mode === 'none' || saving || !newSubject.trim()}
                onClick={addSubject}
                className={`${settingsPrimaryActionClass} min-h-[44px] w-full`}
              >
                {saving ? 'Saving...' : 'Add Course Unit'}
              </button>
            </div>
          </div>

          {selection.mode === 'single' && subjectRows.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--pw-border)] p-3.5 text-xs ac-text-muted">
              <span>No course units added for {selection.className} yet.</span>
              <button
                type="button"
                onClick={preloadUhpabUnits}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 font-bold text-emerald-300 hover:bg-emerald-900/40"
              >
                <Plus size={13} />
                <span>Pre-load UHPAB Standard Units for {selection.className}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <select
            value={selectionSelectValue(selection)}
            onChange={(e) => setSelection(parseSubjectSelection(e.target.value))}
            className="ac-input min-h-[48px] w-full lg:max-w-none"
          >
            <option value="">Select programme or class</option>
            {olevelClassNames.length > 0 ? (
              <option value="band:olevel">O-Level — all O-Level classes ({olevelClassNames.length})</option>
            ) : null}
            {alevelClassNames.length > 0 ? (
              <option value="band:alevel">A-Level — all A-Level classes ({alevelClassNames.length})</option>
            ) : null}
            {otherClassNames.length > 0 ? (
              <optgroup label="Other (single class)">
                {otherClassNames.map((c) => (
                  <option key={c} value={`single:${c}`}>
                    {c}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder={
              selection.mode === 'band' && selection.band === 'alevel'
                ? 'Add principal subject (exact UACE catalog name)'
                : selection.mode === 'single' && isALevelClass(selection.className)
                  ? 'Add principal subject (exact UACE catalog name)'
                  : 'Add subject (e.g., Mathematics)'
            }
            className="ac-input min-h-[48px] w-full"
          />
          <button
            type="button"
            disabled={selection.mode === 'none' || saving}
            onClick={addSubject}
            className={`${settingsPrimaryActionClass} sm:col-span-2 lg:col-span-1`}
          >
            {saving ? 'Saving...' : 'Add Subject'}
          </button>
          {selection.mode === 'band' && selection.band === 'olevel' && (
            <label className="flex min-h-[48px] cursor-pointer items-start gap-3 text-sm leading-snug ac-text-secondary sm:col-span-2 lg:col-span-3">
              <input
                type="checkbox"
                checked={addAsCompulsory}
                onChange={(e) => setAddAsCompulsory(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 rounded border-[var(--pw-border)]"
                aria-label="Add as compulsory UCE subject"
              />
              <span>Add as compulsory UCE for every O-Level class (otherwise subsidiary)</span>
            </label>
          )}
          {selection.mode === 'single' && isOLevelClass(singleClassName) && (
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
          {((selection.mode === 'band' && selection.band === 'alevel') ||
            (selection.mode === 'single' && isALevelClass(singleClassName))) ? (
            <p className="text-xs leading-relaxed ac-text-secondary sm:col-span-2 lg:col-span-3">
              A-Level: new rows must be UACE <strong className="font-medium ac-text-primary">principal</strong> catalog
              subjects only. Subsidiaries are seeded from the national list and cannot be added here.
            </p>
          ) : null}
        </div>
      )}
      </div>
      <div>
        {error && (
          <div className="mb-2 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-sm ac-text-secondary">Loading course units...</div>
        ) : selection.mode === 'none' ? (
          <div className="text-sm ac-text-secondary">
            Select a programme or cohort to view course units.
          </div>
        ) : subjectRows.length === 0 ? (
          <div className="text-sm ac-text-secondary">
            No course units yet for {singleClassName}. Add one above.
          </div>
        ) : (
          <AllSubjectsTableCard
            title="Course units for this programme / cohort"
            selectedClass={singleClassName}
            subjectRows={subjectRows}
            onRemove={removeSubject}
            isTertiary={true}
          />
        )}
      </div>
    </div>
  );
}

