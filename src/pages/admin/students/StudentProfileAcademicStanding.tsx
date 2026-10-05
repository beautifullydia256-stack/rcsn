import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSchoolType } from '@/hooks/useSchoolType';
import {
  fetchStudentCourseRegistrations,
  fetchStudentOutstandingRetakes,
  CourseUnitRegistration,
  OutstandingRetake,
} from '@/features/tertiary/services/courseRegistrationService';
import {
  GraduationCap,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Layers,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import {
  isALevelClass,
  isOLevelClass,
  isSenior12Class,
  isSenior34Class,
} from '@/components/reports/templates/helpers';
import { settingsInsetSurface, settingsPrimaryActionClass } from '@/pages/admin/settings/tabs/settingsTabStyles';
import {
  isGeneralPaperSubject,
  UACE_MAX_ELECTIVE_SUBSIDIARIES,
  UACE_MAX_PRINCIPALS,
  uaceProfileIsComplete,
} from '@/lib/uaceProgrammeRules';

export type StudentProfileAcademicStandingProps = {
  schoolId: string;
  studentId: string;
  currentClass: string;
  classSubjectRows: { subject?: string; uce_offering_type?: string | null }[];
  initialOlevelNames: string[];
  initialAlevelRows: { id: string; subject_name: string; subject_role: string }[];
  onChanged: () => void;
};

/** Table list card: same border/surface as settings, without an extra drop shadow (profile shell already frames the block). */
const standingTableShell = `${settingsInsetSurface} flex min-h-0 flex-col overflow-hidden`;
/** Add-subject controls sit below the inset table, outside the bordered “Subjects” box. */
const standingAddToolbar =
  'rounded-xl border border-slate-200/40 bg-slate-50/95 px-3 py-3 dark:border-white/[0.14] dark:bg-[#1c2431] sm:px-4 sm:py-3.5';

function normalizeClassSubjectRows(
  rows: { subject?: string; uce_offering_type?: string | null }[],
): { subject: string; uce_offering_type: string | null }[] {
  return (rows || [])
    .map((r) => ({
      subject: String(r.subject || '').trim(),
      uce_offering_type: r.uce_offering_type ?? null,
    }))
    .filter((r) => r.subject);
}

function statusProseS34(
  compulsory: string[],
  subsidiaryPool: string[],
  pickedSubs: string[],
  rowCount: number,
): { level: 'ok' | 'warn' | 'bad'; text: string } {
  if (!rowCount) return { level: 'bad', text: 'No class subjects found for this class name.' };
  const total = compulsory.length + pickedSubs.length;
  if (pickedSubs.length === 0 && subsidiaryPool.length > 0) {
    return {
      level: 'warn',
      text: `Choose 1–3 subsidiary subject(s) from the list on the right. All ${compulsory.length} compulsory subject(s) for this class are part of the programme automatically — only subsidiaries are picked here.`,
    };
  }
  if (pickedSubs.length === 0 && subsidiaryPool.length === 0) {
    return {
      level: 'warn',
      text: `No subsidiary pool configured for this class (${total} compulsory subject(s)). Check Admin → Subjects per class.`,
    };
  }
  return {
    level: 'ok',
    text: `Programme: ${compulsory.length} compulsory (automatic) + ${pickedSubs.length} subsidiary (learner choice).`,
  };
}

export default function StudentProfileAcademicStanding({
  schoolId,
  studentId,
  currentClass,
  classSubjectRows,
  initialOlevelNames,
  initialAlevelRows,
  onChanged,
}: StudentProfileAcademicStandingProps) {
  const cls = String(currentClass || '').trim();
  const rows = useMemo(() => normalizeClassSubjectRows(classSubjectRows), [classSubjectRows]);
  const olevelSet = useMemo(() => new Set(initialOlevelNames.map((s) => s.trim()).filter(Boolean)), [initialOlevelNames]);

  const [busy, setBusy] = useState(false);
  const [olevelPick, setOlevelPick] = useState('');
  const [alevelPick, setAlevelPick] = useState('');
  const [principalPick, setPrincipalPick] = useState('');
  const [uaceSubsidiaryNames, setUaceSubsidiaryNames] = useState<string[]>([]);
  const [uacePrincipalCatalog, setUacePrincipalCatalog] = useState<string[]>([]);
  const [uacePrincipalDraft, setUacePrincipalDraft] = useState<string[]>([]);
  const [uacePrincipalSaving, setUacePrincipalSaving] = useState(false);

  const { isTertiary } = useSchoolType();
  const [tertiaryRegistrations, setTertiaryRegistrations] = useState<CourseUnitRegistration[]>([]);
  const [outstandingRetakes, setOutstandingRetakes] = useState<OutstandingRetake[]>([]);
  const [examHistory, setExamHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!isTertiary) return;
    let cancelled = false;

    Promise.all([
      fetchStudentCourseRegistrations(studentId),
      fetchStudentOutstandingRetakes(studentId),
      supabase
        .from('exam_results')
        .select('id, subject, marks_obtained, final_score, exam_score, grade, uace_points, remarks, is_retake, class_name, created_at')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),
    ])
      .then(([regs, retakes, resultsRes]) => {
        if (cancelled) return;
        setTertiaryRegistrations(regs);
        setOutstandingRetakes(retakes);
        setExamHistory(resultsRes.data || []);
      })
      .catch((err) => {
        console.error('Error fetching tertiary academic standing:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isTertiary, schoolId, studentId]);

  useEffect(() => {
    if (!isALevelClass(cls)) return;
    let cancelled = false;
    void Promise.all([
      supabase.from('uace_subject_catalog').select('subject_name').eq('subject_type', 'subsidiary'),
      supabase
        .from('uace_subject_catalog')
        .select('subject_name, sort_order')
        .eq('subject_type', 'principal')
        .order('sort_order'),
    ]).then(([subRes, prRes]) => {
      if (cancelled) return;
      const subNames = (subRes.data || [])
        .map((r) => String((r as { subject_name: string }).subject_name).trim())
        .filter(Boolean)
        .filter((n) => !isGeneralPaperSubject(n));
      setUaceSubsidiaryNames(subNames);
      const pnames = (prRes.data || [])
        .map((r) => String((r as { subject_name: string }).subject_name).trim())
        .filter(Boolean);
      setUacePrincipalCatalog(pnames);
    });
    return () => {
      cancelled = true;
    };
  }, [cls]);

  useEffect(() => {
    if (!isALevelClass(cls)) return;
    const p = initialAlevelRows
      .filter((r) => r.subject_role === 'principal')
      .map((r) => r.subject_name.trim())
      .filter(Boolean);
    setUacePrincipalDraft([...new Set(p)]);
  }, [cls, initialAlevelRows]);

  const fetchOlevelNames = useCallback(async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('student_olevel_subjects')
      .select('subject_name')
      .eq('school_id', schoolId)
      .eq('student_id', studentId);
    if (error) throw error;
    return (data || []).map((r) => String((r as { subject_name: string }).subject_name).trim()).filter(Boolean);
  }, [schoolId, studentId]);

  const persistOlevel = useCallback(
    async (nextNames: string[]) => {
      setBusy(true);
      try {
        const { error } = await supabase.rpc('save_student_olevel_subjects', {
          p_student_id: studentId,
          p_subject_names: nextNames,
        });
        if (error) {
          window.alert(error.message);
          return;
        }
        onChanged();
      } finally {
        setBusy(false);
      }
    },
    [studentId, onChanged],
  );

  const removeOlevelSubsidiary = useCallback(
    async (subject: string) => {
      try {
        const names = await fetchOlevelNames();
        const next = names.filter((n) => n !== subject);
        await persistOlevel(next);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Failed to update subjects');
      }
    },
    [fetchOlevelNames, persistOlevel],
  );

  const addOlevelSubsidiary = useCallback(async () => {
    const sub = olevelPick.trim();
    if (!sub) return;
    try {
      let names = await fetchOlevelNames();
      if (names.includes(sub)) return;
      const compulsorySeed = rows
        .filter((r) => r.uce_offering_type === 'compulsory')
        .map((r) => r.subject);
      if (
        names.length === 0 &&
        compulsorySeed.length > 0 &&
        isOLevelClass(cls) &&
        isSenior34Class(cls)
      ) {
        names = [...compulsorySeed];
      }
      await persistOlevel([...names, sub]);
      setOlevelPick('');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to add subject');
    }
  }, [olevelPick, fetchOlevelNames, persistOlevel, rows, cls]);

  const addAlevelSubsidiary = useCallback(async () => {
    const sub = alevelPick.trim();
    if (!sub) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('student_alevel_subjects').insert({
        school_id: schoolId,
        student_id: studentId,
        subject_name: sub,
        subject_role: 'subsidiary',
      });
      if (error) {
        window.alert(error.message);
        return;
      }
      setAlevelPick('');
      onChanged();
    } finally {
      setBusy(false);
    }
  }, [alevelPick, schoolId, studentId, onChanged]);

  const removeAlevelRow = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        const { error } = await supabase.from('student_alevel_subjects').delete().eq('id', id).eq('school_id', schoolId);
        if (error) {
          window.alert(error.message);
          return;
        }
        onChanged();
      } finally {
        setBusy(false);
      }
    },
    [schoolId, onChanged],
  );

  const persistUacePrincipals = useCallback(
    async (draft: string[]): Promise<boolean> => {
      if (draft.length > UACE_MAX_PRINCIPALS) {
        window.alert(`At most ${UACE_MAX_PRINCIPALS} principal subjects.`);
        return false;
      }
      setUacePrincipalSaving(true);
      try {
        const { error: dErr } = await supabase
          .from('student_alevel_subjects')
          .delete()
          .eq('student_id', studentId)
          .eq('school_id', schoolId)
          .eq('subject_role', 'principal');
        if (dErr) throw dErr;
        if (draft.length > 0) {
          const { error: iErr } = await supabase.from('student_alevel_subjects').insert(
            draft.map((subject_name) => ({
              school_id: schoolId,
              student_id: studentId,
              subject_name,
              subject_role: 'principal' as const,
            })),
          );
          if (iErr) throw iErr;
        }
        setUacePrincipalDraft(draft);
        onChanged();
        return true;
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Failed to save principals');
        return false;
      } finally {
        setUacePrincipalSaving(false);
      }
    },
    [studentId, schoolId, onChanged],
  );

  const addAlevelPrincipal = useCallback(async () => {
    const sub = principalPick.trim();
    if (!sub) return;
    if (uacePrincipalDraft.includes(sub)) return;
    if (uacePrincipalDraft.length >= UACE_MAX_PRINCIPALS) return;
    const next = [...uacePrincipalDraft, sub];
    const ok = await persistUacePrincipals(next);
    if (ok) setPrincipalPick('');
  }, [principalPick, uacePrincipalDraft, persistUacePrincipals]);

  if (!cls) {
    return <p className="text-sm ac-text-secondary">Set the student&apos;s class to manage subjects.</p>;
  }

  /* ─── O-Level Senior 3–4 (UCE subsidiaries on learner profile) ─── */
  if (isOLevelClass(cls) && isSenior34Class(cls)) {
    const compulsory = rows.filter((r) => r.uce_offering_type === 'compulsory').map((r) => r.subject);
    const subsidiaryPool = rows.filter((r) => r.uce_offering_type === 'subsidiary').map((r) => r.subject);
    const pickedSubs = subsidiaryPool.filter((s) => olevelSet.has(s)).sort((a, b) => a.localeCompare(b));
    const addOptions = subsidiaryPool.filter((s) => !olevelSet.has(s)).sort((a, b) => a.localeCompare(b));
    const canAddMore = pickedSubs.length < 3 && addOptions.length > 0;
    const status = statusProseS34(compulsory, subsidiaryPool, pickedSubs, rows.length);
    const compulsorySorted = [...compulsory].sort((a, b) => a.localeCompare(b));

    const statusClass =
      status.level === 'ok'
        ? 'ac-text-secondary'
        : status.level === 'bad'
          ? 'text-rose-700 dark:text-rose-200/90'
          : 'text-amber-700 dark:text-amber-200/90';

    return (
      <div className="space-y-3 sm:space-y-4">
        <div>
          <h3 className="text-base font-semibold leading-snug ac-text-primary">UCE programme (Senior 3–4)</h3>
          <p className={`mt-1 text-xs leading-relaxed ${statusClass}`}>{status.text}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:items-stretch">
          <div className={standingTableShell}>
            <div className="shrink-0 border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
              <div className="text-[15px] font-semibold leading-snug ac-text-primary">Compulsory subjects</div>
              <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
                UCE core for this class — learners must include all of these.
              </div>
            </div>
            {compulsorySorted.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">No compulsory rows for this class.</div>
            ) : (
              <>
                <ul className="divide-y divide-slate-200/35 dark:divide-white/10 sm:hidden">
                  {compulsorySorted.map((sub) => (
                    <li key={sub} className="px-3 py-3.5">
                      <div className="break-words text-[15px] font-semibold leading-snug ac-text-primary">{sub}</div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--pw-muted)]">
                        COMPULSORY · LOCKED
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden min-h-0 flex-1 overflow-x-auto sm:block">
                  <table className="min-w-full text-sm table-fixed">
                    <colgroup>
                      <col className="min-w-0 sm:w-[46%]" />
                      <col className="min-w-0 sm:w-[36%]" />
                      <col className="w-[6.5rem]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-200/30 text-left dark:border-white/10">
                        <th className="px-4 py-2 ac-text-secondary">Subject</th>
                        <th className="px-4 py-2 ac-text-secondary">Notes</th>
                        <th className="px-4 py-2 ac-text-secondary">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr:nth-child(even)]:bg-slate-200/40 dark:[&>tr:nth-child(even)]:bg-white/5">
                      {compulsorySorted.map((sub) => (
                        <tr key={sub} className="border-t border-slate-200/25 dark:border-white/10">
                          <td className="px-4 py-2.5 ac-text-primary font-medium break-words align-top">
                            {sub}
                          </td>
                          <td className="px-4 py-2.5 align-top whitespace-normal">
                            <span className="text-[11px] font-semibold uppercase tracking-wide leading-snug text-[var(--pw-muted)]">
                              COMPULSORY · LOCKED
                            </span>
                          </td>
                          <td className="px-4 py-2.5 align-top whitespace-nowrap">
                            <span className="text-xs text-[var(--pw-muted)]">—</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <div className={standingTableShell}>
              <div className="shrink-0 border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
                <div className="text-[15px] font-semibold leading-snug ac-text-primary">Subsidiary subjects</div>
                <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
                  Optional pool — learners choose from this list (rules apply in Senior 3–4).
                </div>
              </div>

              <ul className="divide-y divide-slate-200/35 dark:divide-white/10 sm:hidden">
                {pickedSubs.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm ac-text-secondary sm:px-4">
                    No subsidiaries on profile yet (up to 3).
                  </li>
                ) : (
                  pickedSubs.map((sub) => (
                    <li key={sub} className="px-3 py-3.5">
                      <div className="break-words text-[15px] font-semibold leading-snug ac-text-primary">{sub}</div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--pw-muted)]">
                        SUBSIDIARY · LEARNER CHOICE
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeOlevelSubsidiary(sub)}
                        className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-rose-600/90 px-4 text-sm font-semibold text-white hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="hidden min-h-0 flex-1 overflow-x-auto sm:block">
                <table className="min-w-full text-sm table-fixed">
                  <colgroup>
                    <col className="min-w-0 sm:w-[46%]" />
                    <col className="min-w-0 sm:w-[36%]" />
                    <col className="w-[6.5rem]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/30 text-left dark:border-white/10">
                      <th className="px-4 py-2 ac-text-secondary">Subject</th>
                      <th className="px-4 py-2 ac-text-secondary">Notes</th>
                      <th className="px-4 py-2 ac-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(even)]:bg-slate-200/40 dark:[&>tr:nth-child(even)]:bg-white/5">
                    {pickedSubs.map((sub) => (
                      <tr key={sub} className="border-t border-slate-200/25 dark:border-white/10">
                        <td className="px-4 py-2.5 ac-text-primary font-medium break-words align-top">
                          {sub}
                        </td>
                        <td className="px-4 py-2.5 align-top whitespace-normal">
                          <span className="text-[11px] font-semibold uppercase tracking-wide leading-snug text-[var(--pw-muted)]">
                            SUBSIDIARY · LEARNER CHOICE
                          </span>
                        </td>
                        <td className="px-4 py-2.5 align-top whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void removeOlevelSubsidiary(sub)}
                            className="min-h-[40px] min-w-[5.5rem] rounded-lg bg-rose-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pickedSubs.length === 0 ? (
                      <tr className="border-t border-slate-200/25 dark:border-white/10">
                        <td colSpan={3} className="px-4 py-6 text-center text-sm ac-text-secondary">
                          No subsidiaries on profile yet — use <strong className="font-medium ac-text-primary">Add subsidiary</strong> below (up
                          to 3).
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={standingAddToolbar}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--pw-muted)]">Add subsidiary</div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium ac-text-muted">Pick from this class list</label>
                  <select
                    value={olevelPick}
                    disabled={!canAddMore || busy}
                    onChange={(e) => setOlevelPick(e.target.value)}
                    className="ac-input min-h-[48px] w-full"
                  >
                    <option value="">
                      {canAddMore ? 'Select subject…' : pickedSubs.length >= 3 ? 'Maximum 3 subsidiaries' : 'None available'}
                    </option>
                    {addOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!olevelPick || !canAddMore || busy}
                  onClick={() => void addOlevelSubsidiary()}
                  className={settingsPrimaryActionClass}
                >
                  {busy ? 'Saving…' : 'Add subsidiary'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── O-Level Senior 1–2 ─── */
  if (isOLevelClass(cls) && isSenior12Class(cls)) {
    const allClass = [...new Set(rows.map((r) => r.subject))].sort((a, b) => a.localeCompare(b));
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-900 dark:text-emerald-100 sm:px-4">
          {allClass.length > 0
            ? `Programme: ${allClass.length} subject(s). Senior 1–2 learners take the full class set; all appear on report cards.`
            : 'No subjects on this class timetable. Configure Admin → Subjects per class.'}
        </div>
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
          <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
            <div className="text-[15px] font-semibold leading-snug ac-text-primary">All class subjects</div>
            <div className="mt-1 text-xs leading-relaxed ac-text-secondary">Principal/subsidiary selection does not apply in Senior 1–2.</div>
          </div>
          {allClass.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">No subjects listed.</div>
          ) : (
            <ul className="divide-y divide-slate-200/35 dark:divide-white/10">
              {allClass.map((sub) => (
                <li key={sub} className="px-3 py-3.5 sm:px-4">
                  <span className="text-[15px] font-semibold ac-text-primary">{sub}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  /* ─── A-Level (UACE) ─── */
  if (isALevelClass(cls)) {
    const subsidiaries = initialAlevelRows.filter((r) => r.subject_role === 'subsidiary').sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    const electiveSubs = subsidiaries.filter((r) => !isGeneralPaperSubject(r.subject_name));
    const classSubjectSet = new Set(rows.map((r) => r.subject));
    const subTaken = new Set(subsidiaries.map((r) => r.subject_name));
    const addAlevelOptions = uaceSubsidiaryNames
      .filter((n) => classSubjectSet.has(n) && !subTaken.has(n))
      .sort((a, b) => a.localeCompare(b));
    const addPrincipalOptions = uacePrincipalCatalog
      .filter((n) => classSubjectSet.has(n) && !uacePrincipalDraft.includes(n))
      .sort((a, b) => a.localeCompare(b));
    const canAddMorePrincipals =
      uacePrincipalDraft.length < UACE_MAX_PRINCIPALS && addPrincipalOptions.length > 0;
    const principalRows = initialAlevelRows
      .filter((r) => r.subject_role === 'principal')
      .sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    const principalComplete = uacePrincipalDraft.length === UACE_MAX_PRINCIPALS;
    const hasGP = subsidiaries.some((r) => isGeneralPaperSubject(r.subject_name));
    const electiveOk = electiveSubs.length === UACE_MAX_ELECTIVE_SUBSIDIARIES;
    const uaceOk = uaceProfileIsComplete(uacePrincipalDraft, subsidiaries.map((r) => r.subject_name));
    const uaceParts = [
      !principalComplete ? `Principals ${uacePrincipalDraft.length}/${UACE_MAX_PRINCIPALS}` : '',
      !hasGP ? 'General Paper missing — set class to A-Level or contact admin' : '',
      !electiveOk ? `Elective ${electiveSubs.length}/${UACE_MAX_ELECTIVE_SUBSIDIARIES}` : '',
    ].filter(Boolean);
    const uaceStatusLine = uaceOk
      ? 'Programme complete: 3 principals, General Paper, 1 elective (5 subjects on reports).'
      : uaceParts.length > 0
        ? `Still needed: ${uaceParts.join(' · ')}.`
        : 'Add principals and one elective subsidiary.';

    return (
      <div className="space-y-3 sm:space-y-4">
        <div>
          <h3 className="text-base font-semibold leading-snug ac-text-primary">UACE programme (Senior 5–6)</h3>
          <p
            className={`mt-1 text-xs leading-relaxed ${
              uaceOk ? 'ac-text-secondary' : 'text-amber-700 dark:text-amber-200/90'
            }`}
          >
            {uaceStatusLine}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-h-0 flex-col gap-3">
            <div className={standingTableShell}>
              <div className="shrink-0 border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
                <div className="text-[15px] font-semibold leading-snug ac-text-primary">Principal subjects</div>
                <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
                  Only subjects saved on this learner&apos;s profile are listed here (up to {UACE_MAX_PRINCIPALS}). Add or remove
                  below — same idea as subsidiary choices in Senior 3–4.
                </div>
              </div>

              <ul className="divide-y divide-slate-200/35 dark:divide-white/10 sm:hidden">
                {principalRows.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm ac-text-secondary sm:px-4">
                    No principals on profile yet (up to {UACE_MAX_PRINCIPALS}).
                  </li>
                ) : (
                  principalRows.map((r) => (
                    <li key={r.id} className="px-3 py-3.5">
                      <div className="break-words text-[15px] font-semibold leading-snug ac-text-primary">{r.subject_name}</div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--pw-muted)]">
                        PRINCIPAL · LEARNER CHOICE
                      </div>
                      <button
                        type="button"
                        disabled={busy || uacePrincipalSaving}
                        onClick={() => void removeAlevelRow(r.id)}
                        className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-rose-600/90 px-4 text-sm font-semibold text-white hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="hidden min-h-0 flex-1 overflow-x-auto sm:block">
                <table className="min-w-full text-sm table-fixed">
                  <colgroup>
                    <col className="min-w-0 sm:w-[46%]" />
                    <col className="min-w-0 sm:w-[36%]" />
                    <col className="w-[6.5rem]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/30 text-left dark:border-white/10">
                      <th className="px-4 py-2 ac-text-secondary">Subject</th>
                      <th className="px-4 py-2 ac-text-secondary">Notes</th>
                      <th className="px-4 py-2 ac-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(even)]:bg-slate-200/40 dark:[&>tr:nth-child(even)]:bg-white/5">
                    {principalRows.map((r) => (
                      <tr key={r.id} className="border-t border-slate-200/25 dark:border-white/10">
                        <td className="px-4 py-2.5 ac-text-primary font-medium break-words align-top">{r.subject_name}</td>
                        <td className="px-4 py-2.5 align-top whitespace-normal">
                          <span className="text-[11px] font-semibold uppercase tracking-wide leading-snug text-[var(--pw-muted)]">
                            PRINCIPAL · LEARNER CHOICE
                          </span>
                        </td>
                        <td className="px-4 py-2.5 align-top whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy || uacePrincipalSaving}
                            onClick={() => void removeAlevelRow(r.id)}
                            className="min-h-[40px] min-w-[5.5rem] rounded-lg bg-rose-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {principalRows.length === 0 ? (
                      <tr className="border-t border-slate-200/25 dark:border-white/10">
                        <td colSpan={3} className="px-4 py-6 text-center text-sm ac-text-secondary">
                          No principals on profile yet — use <strong className="font-medium ac-text-primary">Add principal</strong>{' '}
                          below (up to {UACE_MAX_PRINCIPALS}).
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={standingAddToolbar}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--pw-muted)]">Add principal</div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium ac-text-muted">Pick from class list (UACE catalog)</label>
                  <select
                    value={principalPick}
                    disabled={!canAddMorePrincipals || busy || uacePrincipalSaving || uacePrincipalCatalog.length === 0}
                    onChange={(e) => setPrincipalPick(e.target.value)}
                    className="ac-input min-h-[48px] w-full"
                  >
                    <option value="">
                      {uacePrincipalCatalog.length === 0
                        ? 'Loading catalog…'
                        : uacePrincipalDraft.length >= UACE_MAX_PRINCIPALS
                          ? `Maximum ${UACE_MAX_PRINCIPALS} principals`
                          : addPrincipalOptions.length === 0
                            ? 'No options'
                            : 'Select subject…'}
                    </option>
                    {addPrincipalOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!principalPick || !canAddMorePrincipals || busy || uacePrincipalSaving}
                  onClick={() => void addAlevelPrincipal()}
                  className={settingsPrimaryActionClass}
                >
                  {uacePrincipalSaving ? 'Saving…' : 'Add principal'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <div className={standingTableShell}>
              <div className="shrink-0 border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
                <div className="text-[15px] font-semibold leading-snug ac-text-primary">Subsidiary subjects</div>
                <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
                  General Paper is automatic. Optional pool — choose one elective from the list (Senior 5–6 rules).
                </div>
              </div>

              <ul className="divide-y divide-slate-200/35 dark:divide-white/10 sm:hidden">
                <li className="px-3 py-3.5">
                  <div className="break-words text-[15px] font-semibold leading-snug ac-text-primary">General Paper</div>
                  <div className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--pw-muted)]">
                    {hasGP ? 'SUBSIDIARY · AUTOMATIC · LOCKED' : 'SUBSIDIARY · AUTOMATIC · PENDING'}
                  </div>
                </li>
                {electiveSubs.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm ac-text-secondary sm:px-4">
                    No elective on profile yet (max {UACE_MAX_ELECTIVE_SUBSIDIARIES}).
                  </li>
                ) : (
                  electiveSubs.map((r) => (
                    <li key={r.id} className="px-3 py-3.5">
                      <div className="break-words text-[15px] font-semibold leading-snug ac-text-primary">{r.subject_name}</div>
                      <div className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--pw-muted)]">
                        SUBSIDIARY · ELECTIVE
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeAlevelRow(r.id)}
                        className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-rose-600/90 px-4 text-sm font-semibold text-white hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <div className="hidden min-h-0 flex-1 overflow-x-auto sm:block">
                <table className="min-w-full text-sm table-fixed">
                  <colgroup>
                    <col className="min-w-0 sm:w-[46%]" />
                    <col className="min-w-0 sm:w-[36%]" />
                    <col className="w-[6.5rem]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/30 text-left dark:border-white/10">
                      <th className="px-4 py-2 ac-text-secondary">Subject</th>
                      <th className="px-4 py-2 ac-text-secondary">Notes</th>
                      <th className="px-4 py-2 ac-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(even)]:bg-slate-200/40 dark:[&>tr:nth-child(even)]:bg-white/5">
                    <tr className="border-t border-slate-200/25 dark:border-white/10">
                      <td className="px-4 py-2.5 ac-text-primary font-medium break-words align-top">General Paper</td>
                      <td className="px-4 py-2.5 align-top whitespace-normal">
                        <span className="text-[11px] font-semibold uppercase tracking-wide leading-snug text-[var(--pw-muted)]">
                          {hasGP ? 'SUBSIDIARY · AUTOMATIC · LOCKED' : 'SUBSIDIARY · AUTOMATIC · PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 align-top whitespace-nowrap">
                        <span className="text-xs text-[var(--pw-muted)]">—</span>
                      </td>
                    </tr>
                    {electiveSubs.map((r) => (
                      <tr key={r.id} className="border-t border-slate-200/25 dark:border-white/10">
                        <td className="px-4 py-2.5 ac-text-primary font-medium break-words align-top">
                          {r.subject_name}
                        </td>
                        <td className="px-4 py-2.5 align-top whitespace-normal">
                          <span className="text-[11px] font-semibold uppercase tracking-wide leading-snug text-[var(--pw-muted)]">
                            SUBSIDIARY · ELECTIVE
                          </span>
                        </td>
                        <td className="px-4 py-2.5 align-top whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void removeAlevelRow(r.id)}
                            className="min-h-[40px] min-w-[5.5rem] rounded-lg bg-rose-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {electiveSubs.length === 0 ? (
                      <tr className="border-t border-slate-200/25 dark:border-white/10">
                        <td colSpan={3} className="px-4 py-6 text-center text-sm ac-text-secondary">
                          No elective on profile yet — use <strong className="font-medium ac-text-primary">Add elective subsidiary</strong> below (max{' '}
                          {UACE_MAX_ELECTIVE_SUBSIDIARIES}).
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={standingAddToolbar}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--pw-muted)]">Add elective subsidiary</div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium ac-text-muted">Pick from class list (UACE catalog)</label>
                  <select
                    value={alevelPick}
                    disabled={
                      busy || electiveSubs.length >= UACE_MAX_ELECTIVE_SUBSIDIARIES || addAlevelOptions.length === 0
                    }
                    onChange={(e) => setAlevelPick(e.target.value)}
                    className="ac-input min-h-[48px] w-full"
                  >
                    <option value="">
                      {electiveSubs.length >= UACE_MAX_ELECTIVE_SUBSIDIARIES
                        ? `Maximum ${UACE_MAX_ELECTIVE_SUBSIDIARIES} elective`
                        : addAlevelOptions.length === 0
                          ? 'No options'
                          : 'Select subject…'}
                    </option>
                    {addAlevelOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!alevelPick || busy || electiveSubs.length >= UACE_MAX_ELECTIVE_SUBSIDIARIES}
                  onClick={() => void addAlevelSubsidiary()}
                  className={settingsPrimaryActionClass}
                >
                  {busy ? 'Saving…' : 'Add subsidiary'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Tertiary Course Units & Retakes (UNMEB Standard) ─── */
  if (isTertiary) {
    const totalCredits = tertiaryRegistrations.reduce((acc, r) => acc + (r.credit_units || 3), 0);

    return (
      <div className="space-y-4">
        {/* KPI Mini-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className={`${settingsInsetSurface} p-3 rounded-xl`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pw-muted)]">
              Enrolled Units
            </div>
            <div className="text-xl font-bold ac-text-primary mt-1">
              {tertiaryRegistrations.length}
            </div>
          </div>

          <div className={`${settingsInsetSurface} p-3 rounded-xl`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pw-muted)]">
              Credit Load
            </div>
            <div className="text-xl font-bold text-purple-400 mt-1">
              {totalCredits} <span className="text-xs text-[var(--pw-muted)] font-normal">CU</span>
            </div>
          </div>

          <div className={`${settingsInsetSurface} p-3 rounded-xl`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pw-muted)]">
              Outstanding Retakes
            </div>
            <div className={`text-xl font-bold mt-1 ${outstandingRetakes.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {outstandingRetakes.length}
            </div>
          </div>

          <div className={`${settingsInsetSurface} p-3 rounded-xl`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pw-muted)]">
              Exam Sittings
            </div>
            <div className="text-xl font-bold ac-text-primary mt-1">
              {examHistory.length}
            </div>
          </div>
        </div>

        {/* OUTSTANDING RETAKES ALERT */}
        {outstandingRetakes.length > 0 && (
          <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Outstanding Retakes ({outstandingRetakes.length}) · Below 50.0% Pass Mark</span>
            </div>
            <div className="divide-y divide-rose-500/20">
              {outstandingRetakes.map((retake) => (
                <div key={retake.course_unit_code} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-rose-200">
                      <span className="font-mono mr-1.5">{retake.course_unit_code}</span>
                      {retake.course_unit_title}
                    </div>
                    <div className="text-[11px] text-rose-300/70 mt-0.5">
                      Failed in {retake.failed_semester} · Score: {retake.failed_score}% (Grade {retake.failed_grade})
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-rose-500/25 text-rose-200 border border-rose-500/40">
                    Retake Required
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ENROLLED COURSE UNITS FOR SEMESTER */}
        <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10 rounded-2xl`}>
          <div className="border-b border-slate-200/30 px-4 py-3 dark:border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold leading-snug ac-text-primary flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Semester Course Unit Enrolments</span>
              </div>
              <div className="text-[11px] text-[var(--pw-muted)] mt-0.5">
                Current modular course units assigned to trainee for classroom attendance & assessment marksheets.
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-purple-500/10 text-purple-400">
              {cls}
            </span>
          </div>

          {tertiaryRegistrations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm ac-text-secondary">
              No course unit registrations logged for this semester yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/30 dark:border-white/10 text-[var(--pw-muted)] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Course Unit</th>
                    <th className="py-2.5 px-4">Credit Units</th>
                    <th className="py-2.5 px-4">Sitting Type</th>
                    <th className="py-2.5 px-4">Semester</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/20 dark:divide-white/5">
                  {tertiaryRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-purple-500/5 transition-colors">
                      <td className="py-2.5 px-4 font-medium ac-text-primary">
                        <span className="font-mono text-purple-400 font-bold mr-1.5">{reg.course_unit_code}</span>
                        {reg.course_unit_title}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[var(--pw-muted)]">
                        {reg.credit_units ?? 3} CU
                      </td>
                      <td className="py-2.5 px-4">
                        {reg.registration_type === 'retake' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <Repeat className="w-2.5 h-2.5" />
                            RETAKE
                          </span>
                        ) : reg.registration_type === 'deferred' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            DEFERRED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                            REGULAR
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--pw-muted)]">
                        {reg.offering_semester}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          reg.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {reg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EXAMINATION HISTORY & RETAKE RATIONALES */}
        {examHistory.length > 0 && (
          <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10 rounded-2xl`}>
            <div className="border-b border-slate-200/30 px-4 py-3 dark:border-white/10">
              <div className="text-[14px] font-semibold leading-snug ac-text-primary flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>Examination Sittings & Performance History</span>
              </div>
              <div className="text-[11px] text-[var(--pw-muted)] mt-0.5">
                Official marks recorded on the 5.0 UHPAB scale. Scores &lt; 50.0% require a retake sitting.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/30 dark:border-white/10 text-[var(--pw-muted)] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Course Unit</th>
                    <th className="py-2.5 px-4">Score (/100)</th>
                    <th className="py-2.5 px-4">Grade</th>
                    <th className="py-2.5 px-4">GP (5.0)</th>
                    <th className="py-2.5 px-4">Standing / Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/20 dark:divide-white/5">
                  {examHistory.map((ex) => {
                    const mark = ex.marks_obtained ?? ex.final_score ?? ex.exam_score;
                    const isFail = mark !== null && mark < 50;

                    return (
                      <tr key={ex.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="py-2.5 px-4 font-semibold ac-text-primary">
                          {ex.subject}
                          {ex.is_retake && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/20 text-rose-400">
                              Retake Sitting
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold">
                          {mark !== null && mark !== undefined ? `${mark}%` : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-bold">
                          <span className={isFail ? 'text-rose-400' : 'text-emerald-400'}>
                            {ex.grade || (isFail ? 'F' : '—')}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          {ex.uace_points !== null && ex.uace_points !== undefined ? ex.uace_points.toFixed(1) : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          {isFail ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                              <AlertTriangle className="w-3 h-3" />
                              Failed &lt; 50.0% Pass Mark (Retake Required)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Passed · Credit Earned
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Primary / other ─── */
  const flat = [...new Set(rows.map((r) => r.subject))].sort((a, b) => a.localeCompare(b));
  return (
    <div className="space-y-3">
      <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
        <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
          <div className="text-[15px] font-semibold leading-snug ac-text-primary">Subjects for {cls}</div>
          <div className="mt-1 text-xs leading-relaxed ac-text-secondary">From Admin → Subjects per class for this class.</div>
        </div>
        {flat.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">No subjects linked to this class yet.</div>
        ) : (
          <ul className="divide-y divide-slate-200/35 dark:divide-white/10">
            {flat.map((sub) => (
              <li key={sub} className="px-3 py-3.5 sm:px-4">
                <span className="text-[15px] font-semibold ac-text-primary">{sub}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
