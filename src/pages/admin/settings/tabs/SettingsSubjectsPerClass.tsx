import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';
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
      <div className="px-4 py-8 text-center text-xs font-mono text-[#888888]">
        {isTertiary ? 'NO COURSE UNITS REGISTERED IN THIS COHORT' : 'NO SUBJECTS REGISTERED IN THIS CLASS'}
      </div>
    );
  }
  return (
    <div className="gov-table-container">
      <table className="gov-table">
        <thead>
          <tr>
            <th className="font-mono">{isTertiary ? 'COURSE UNIT / MODULE TITLE' : 'SUBJECT NAME'}</th>
            <th className="font-mono">CLASSIFICATION</th>
            <th className="font-mono text-right w-[6.5rem]">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const badge = classSubjectBadge(row, selectedClass);
            const rem = canRemoveClassSubjectRow(selectedClass, row);
            return (
              <tr key={row.subject}>
                <td className="font-medium text-[#111111]">
                  {row.subject}
                </td>
                <td>
                  {badge ? (
                    <span className="gov-tag gov-tag-approved text-[10px] font-mono uppercase">{badge}</span>
                  ) : null}
                  {!rem && (
                    <span className="ml-2 text-[10px] font-mono text-[#888888] uppercase" title="Cannot remove this slot">
                      [LOCKED]
                    </span>
                  )}
                </td>
                <td className="text-right">
                  {rem ? (
                    <button
                      type="button"
                      onClick={() => onRemove(row)}
                      className="gov-btn gov-btn-sm text-red-600 border-[#CCCCCC] hover:bg-red-50"
                    >
                      REMOVE
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-[#888888]">—</span>
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
    <div className="gov-card p-0 overflow-hidden mt-4">
      <div className="border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between bg-[#FDFDFD]">
        <div className="text-xs font-mono uppercase font-bold text-[#111111]">{title}</div>
        <div className="text-xs font-mono font-bold text-[#111111] bg-[#EAEAEA] px-2 py-0.5 border border-[#CCCCCC] rounded">
          {selectedClass}
        </div>
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
    <div className="space-y-6">
      <SectionHeader
        embedded={embedded}
        title={isTertiary ? 'COURSE UNITS & CURRICULUM REGISTRY' : 'SUBJECTS PER CLASS REGISTRY'}
        badge="CURRICULUM SPECIFICATION"
      />

      <div className="gov-card p-5 space-y-4">
        {isTertiary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="sm:col-span-2">
                <TertiaryCohortPicker
                  selectedCohort={singleClassName}
                  onChange={(cohort) =>
                    setSelection(cohort ? { mode: 'single', className: cohort } : { mode: 'none' })
                  }
                  layout="grid"
                  showLabels
                  programmeLabel="PROGRAMME"
                  semesterLabel="YEAR & SEMESTER"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
                  COURSE UNIT TITLE
                </label>
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Pharmacology, Medical Nursing"
                  className="gov-input w-full"
                />
              </div>
              <div>
                <button
                  type="button"
                  disabled={selection.mode === 'none' || saving || !newSubject.trim()}
                  onClick={addSubject}
                  className="gov-btn gov-btn-sm gov-btn-primary w-full h-[38px]"
                >
                  {saving ? 'SAVING...' : 'ADD COURSE UNIT'}
                </button>
              </div>
            </div>

            {selection.mode === 'single' && subjectRows.length === 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-dashed border-[#CCCCCC] p-3 text-xs font-mono bg-[#FAFAFA]">
                <span className="text-[#666666]">NO COURSE UNITS RECORDED FOR {selection.className}</span>
                <button
                  type="button"
                  onClick={preloadUhpabUnits}
                  disabled={saving}
                  className="gov-btn gov-btn-sm font-mono inline-flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>PRE-LOAD UHPAB STANDARD CURRICULUM</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            <select
              value={selectionSelectValue(selection)}
              onChange={(e) => setSelection(parseSubjectSelection(e.target.value))}
              className="gov-select w-full"
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
              placeholder="Add subject title"
              className="gov-input w-full"
            />
            <button
              type="button"
              disabled={selection.mode === 'none' || saving}
              onClick={addSubject}
              className="gov-btn gov-btn-sm gov-btn-primary"
            >
              {saving ? 'SAVING...' : 'ADD SUBJECT'}
            </button>
          </div>
        )}
      </div>

      <div>
        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-xs font-mono text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <GovRollingBox size="md" />
          </div>
        ) : selection.mode === 'none' ? (
          <div className="text-xs font-mono text-[#888888] py-4">
            SELECT A PROGRAMME OR COHORT TO AUDIT CURRICULUM.
          </div>
        ) : subjectRows.length === 0 ? (
          <div className="text-xs font-mono text-[#888888] py-4">
            NO COURSE UNITS FOUND FOR {singleClassName}.
          </div>
        ) : (
          <AllSubjectsTableCard
            title="ACTIVE COURSE UNITS & CURRICULUM MODULES"
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

