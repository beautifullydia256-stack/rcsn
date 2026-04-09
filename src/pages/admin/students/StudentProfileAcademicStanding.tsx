import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  isALevelClass,
  isOLevelClass,
  isSenior12Class,
  isSenior34Class,
} from '@/components/reports/templates/helpers';
import { settingsInsetSurface, settingsPrimaryActionClass } from '@/pages/admin/settings/tabs/settingsTabStyles';

export type StudentProfileAcademicStandingProps = {
  schoolId: string;
  studentId: string;
  currentClass: string;
  classSubjectRows: { subject?: string; uce_offering_type?: string | null }[];
  initialOlevelNames: string[];
  initialAlevelRows: { id: string; subject_name: string; subject_role: string }[];
  onChanged: () => void;
};

function isGeneralPaperSubject(name: string): boolean {
  return /general\s*paper/i.test(String(name || '').trim());
}

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
      text: `Incomplete: add 1–3 subsidiary subject(s). Showing ${compulsory.length} compulsory only (${total} on profile).`,
    };
  }
  if (pickedSubs.length === 0 && subsidiaryPool.length === 0) {
    return {
      level: 'warn',
      text: `No subsidiary pool configured for this class. ${total} subject(s) on profile. Check Admin → Subjects per class.`,
    };
  }
  return {
    level: 'ok',
    text: `Profile: ${total} subject(s) — ${compulsory.length} compulsory + ${pickedSubs.length} subsidiary (choose 1–3).`,
  };
}

function CompulsoryList({
  subjects,
  olevelSet,
}: {
  subjects: string[];
  olevelSet: Set<string>;
}) {
  if (subjects.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">No compulsory rows for this class.</div>
    );
  }
  return (
    <ul className="divide-y divide-slate-200/35 dark:divide-white/10">
      {subjects.map((sub) => {
        const onProfile = olevelSet.has(sub);
        return (
          <li key={sub} className="px-3 py-3.5 sm:px-4">
            <div className="break-words text-[15px] font-semibold leading-snug ac-text-primary">{sub}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-[var(--pw-border)] bg-[var(--pw-s2)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--pw-muted)]">
                compulsory
              </span>
              <span
                className={
                  onProfile
                    ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
                    : 'text-xs font-medium text-amber-700 dark:text-amber-300'
                }
              >
                {onProfile ? 'On learner profile' : 'Not on profile yet — adjust learner subjects or save from Admin'}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SubsidiaryLearnerList({
  picked,
  busy,
  onRemove,
}: {
  picked: string[];
  busy: boolean;
  onRemove: (subject: string) => void;
}) {
  if (picked.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">
        Not selected yet — add 1–3 subsidiaries from the school list below.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-200/35 dark:divide-white/10">
      {picked.map((sub) => (
        <li key={sub} className="px-3 py-3.5 sm:px-4">
          <div className="break-words text-[15px] font-semibold leading-snug ac-text-primary">{sub}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[var(--pw-border)] bg-[var(--pw-s2)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--pw-muted)]">
              subsidiary
            </span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(sub)}
            className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-rose-600/90 px-4 text-sm font-semibold text-white hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50"
          >
            Remove from learner
          </button>
        </li>
      ))}
    </ul>
  );
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
  const [uaceSubsidiaryNames, setUaceSubsidiaryNames] = useState<string[]>([]);

  useEffect(() => {
    if (!isALevelClass(cls)) return;
    let cancelled = false;
    void supabase
      .from('uace_subject_catalog')
      .select('subject_name')
      .eq('subject_type', 'subsidiary')
      .then(({ data }) => {
        if (cancelled) return;
        setUaceSubsidiaryNames((data || []).map((r) => String((r as { subject_name: string }).subject_name).trim()).filter(Boolean));
      });
    return () => {
      cancelled = true;
    };
  }, [cls]);

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

    return (
      <div className="space-y-4">
        <div
          className={`rounded-xl border px-3 py-2.5 text-sm leading-snug sm:px-4 ${
            status.level === 'ok'
              ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
              : status.level === 'bad'
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-900 dark:text-rose-100'
                : 'border-amber-400/35 bg-amber-500/10 text-amber-950 dark:text-amber-100'
          }`}
        >
          {status.text}
        </div>

        <div className="space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4">
          <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
            <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
              <div className="text-[15px] font-semibold leading-snug ac-text-primary">Compulsory subjects</div>
              <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
                UCE core for this class — learners must include all of these on their profile.
              </div>
            </div>
            <CompulsoryList subjects={[...compulsory].sort((a, b) => a.localeCompare(b))} olevelSet={olevelSet} />
          </div>

          <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
            <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
              <div className="text-[15px] font-semibold leading-snug ac-text-primary">Subsidiary subjects (learner)</div>
              <div className="mt-1 text-xs leading-relaxed ac-text-secondary">
                Choose 1–3 from the subsidiary pool configured in Admin → Subjects per class.
              </div>
            </div>
            <SubsidiaryLearnerList picked={pickedSubs} busy={busy} onRemove={(s) => void removeOlevelSubsidiary(s)} />
            <div className="border-t border-slate-200/30 p-3 dark:border-white/10 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium ac-text-muted">Add subsidiary from class list</label>
                  <select
                    value={olevelPick}
                    disabled={!canAddMore || busy}
                    onChange={(e) => setOlevelPick(e.target.value)}
                    className="ac-input min-h-[48px] w-full"
                  >
                    <option value="">{canAddMore ? 'Select subject…' : pickedSubs.length >= 3 ? 'Maximum 3 subsidiaries' : 'None available'}</option>
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
    const principals = initialAlevelRows.filter((r) => r.subject_role === 'principal').sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    const subsidiaries = initialAlevelRows.filter((r) => r.subject_role === 'subsidiary').sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    const classSubjectSet = new Set(rows.map((r) => r.subject));
    const subTaken = new Set(subsidiaries.map((r) => r.subject_name));
    const addAlevelOptions = uaceSubsidiaryNames
      .filter((n) => classSubjectSet.has(n) && !subTaken.has(n))
      .sort((a, b) => a.localeCompare(b));
    const hasGP = subsidiaries.some((r) => isGeneralPaperSubject(r.subject_name));
    const uaceOk = principals.length === 3 && subsidiaries.length === 2 && hasGP;
    const uaceMsg = uaceOk
      ? 'UACE profile complete: 3 principals + 2 subsidiaries (including General Paper). Five subjects on reports.'
      : `Incomplete UACE profile${[
          principals.length !== 3 ? `principals ${principals.length}/3` : '',
          subsidiaries.length !== 2 ? `subsidiaries ${subsidiaries.length}/2` : '',
          subsidiaries.length >= 1 && !hasGP ? 'General Paper must be one of the two subsidiaries' : '',
        ]
          .filter(Boolean)
          .join('; ')}.`;

    return (
      <div className="space-y-4">
        <div
          className={`rounded-xl border px-3 py-2.5 text-sm leading-snug sm:px-4 ${
            uaceOk
              ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
              : principals.length + subsidiaries.length === 0
                ? 'border-rose-400/40 bg-rose-500/10 text-rose-900 dark:text-rose-100'
                : 'border-amber-400/35 bg-amber-500/10 text-amber-950 dark:text-amber-100'
          }`}
        >
          {uaceMsg}
        </div>

        <div className="space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4">
          <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
            <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
              <div className="text-[15px] font-semibold leading-snug ac-text-primary">Principal (3)</div>
              <div className="mt-1 text-xs leading-relaxed ac-text-secondary">Configured for this learner — edit only with admin tools if combinations change.</div>
            </div>
            {principals.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">No principals saved yet.</div>
            ) : (
              <ul className="divide-y divide-slate-200/35 dark:divide-white/10">
                {principals.map((r) => (
                  <li key={r.id} className="px-3 py-3.5 sm:px-4">
                    <span className="text-[15px] font-semibold ac-text-primary">{r.subject_name}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--pw-muted)]">principal</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${settingsInsetSurface} overflow-hidden shadow-lg shadow-black/10`}>
            <div className="border-b border-slate-200/30 px-3 py-3 dark:border-white/10 sm:px-4 sm:py-3">
              <div className="text-[15px] font-semibold leading-snug ac-text-primary">Subsidiary (2, incl. General Paper)</div>
              <div className="mt-1 text-xs leading-relaxed ac-text-secondary">Add or remove subsidiaries from subjects offered for this class (UACE catalog + class list).</div>
            </div>
            {subsidiaries.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm ac-text-secondary sm:px-4">None saved yet.</div>
            ) : (
              <ul className="divide-y divide-slate-200/35 dark:divide-white/10">
                {subsidiaries.map((r) => (
                  <li key={r.id} className="px-3 py-3.5 sm:px-4">
                    <div className="text-[15px] font-semibold ac-text-primary">{r.subject_name}</div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeAlevelRow(r.id)}
                      className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-rose-600/90 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      Remove from learner
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-slate-200/30 p-3 dark:border-white/10 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium ac-text-muted">Add subsidiary</label>
                  <select
                    value={alevelPick}
                    disabled={busy || subsidiaries.length >= 2 || addAlevelOptions.length === 0}
                    onChange={(e) => setAlevelPick(e.target.value)}
                    className="ac-input min-h-[48px] w-full"
                  >
                    <option value="">
                      {subsidiaries.length >= 2 ? 'Maximum 2 subsidiaries' : addAlevelOptions.length === 0 ? 'No options' : 'Select subject…'}
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
                  disabled={!alevelPick || busy || subsidiaries.length >= 2}
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
