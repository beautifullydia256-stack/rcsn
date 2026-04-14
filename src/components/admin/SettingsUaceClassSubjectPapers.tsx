import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isALevelClass } from '../reports/templates/helpers';
import { settingsInsetSurface, settingsPrimaryActionClass } from '@/pages/admin/settings/tabs/settingsTabStyles';
import type { SchoolUaceClassSubjectPaperRow } from '../../lib/uaceClassSubjectPapers';
import {
  fetchUacePapersForClassSubject,
  UACE_PAPERS_STORAGE_CLASS,
} from '../../lib/uaceClassSubjectPapers';

type Variant = 'vite' | 'next';

const WEIGHT_SUM_TOLERANCE = 0.02;

function equalSplitWeights(count: 1 | 2 | 3): number[] {
  if (count === 1) return [100];
  if (count === 2) return [50, 50];
  const third = Number((100 / 3).toFixed(2));
  return [third, third, Number((100 - 2 * third).toFixed(2))];
}

export default function SettingsUaceClassSubjectPapers({
  classOptions,
  schoolId,
  variant = 'vite',
  embedded,
  anchorClassName,
}: {
  classOptions: string[];
  schoolId: string | null;
  variant?: Variant;
  embedded?: boolean;
  anchorClassName?: string;
}) {
  const alevelClasses = useMemo(() => classOptions.filter((c) => isALevelClass(c)), [classOptions]);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectNames, setSubjectNames] = useState<string[]>([]);
  const [paperRows, setPaperRows] = useState<SchoolUaceClassSubjectPaperRow[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [paperCount, setPaperCount] = useState<1 | 2 | 3>(1);
  const [weights, setWeights] = useState<number[]>([100]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    if (!schoolId) {
      setSubjectNames([]);
      return;
    }
    setLoadingSubjects(true);
    setError(null);
    try {
      if (anchorClassName !== undefined) {
        const cn = anchorClassName.trim();
        if (!cn || !isALevelClass(cn)) {
          setSubjectNames([]);
          return;
        }
        const { data, error: qErr } = await supabase
          .from('class_subjects')
          .select('subject')
          .eq('school_id', schoolId)
          .eq('class_name', cn)
          .order('subject');
        if (qErr) throw qErr;
        setSubjectNames((data || []).map((r) => r.subject as string));
        return;
      }
      if (alevelClasses.length === 0) {
        setSubjectNames([]);
        return;
      }
      const { data, error: qErr } = await supabase
        .from('class_subjects')
        .select('subject, class_name')
        .eq('school_id', schoolId)
        .in('class_name', alevelClasses);
      if (qErr) throw qErr;
      const uniq = [...new Set((data || []).map((r) => r.subject as string))].sort((a, b) =>
        a.localeCompare(b),
      );
      setSubjectNames(uniq);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subjects');
      setSubjectNames([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, [schoolId, anchorClassName, alevelClasses]);

  const loadPapers = useCallback(async () => {
    if (!schoolId || !selectedSubject.trim()) {
      setPaperRows([]);
      return;
    }
    setLoadingPapers(true);
    setError(null);
    try {
      const rows = await fetchUacePapersForClassSubject(
        schoolId,
        UACE_PAPERS_STORAGE_CLASS,
        selectedSubject,
      );
      setPaperRows(rows);
      if (rows.length > 0) {
        const sorted = [...rows].sort((a, b) => a.paper_slot - b.paper_slot);
        const n = sorted.length;
        setPaperCount((n >= 3 ? 3 : n >= 2 ? 2 : 1) as 1 | 2 | 3);
        setWeights(sorted.map((r) => Number(r.weight_percent)));
      } else {
        setPaperCount(1);
        setWeights([100]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load papers');
      setPaperRows([]);
      setPaperCount(1);
      setWeights([100]);
    } finally {
      setLoadingPapers(false);
    }
  }, [schoolId, selectedSubject]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    void loadPapers();
  }, [loadPapers]);

  useEffect(() => {
    if (anchorClassName === undefined) return;
    if (!anchorClassName.trim() || !isALevelClass(anchorClassName)) return;
    setSelectedSubject('');
  }, [anchorClassName]);

  const weightTotal = useMemo(() => weights.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0), [weights]);
  const weightsValid = Math.abs(weightTotal - 100) <= WEIGHT_SUM_TOLERANCE;

  const inputClass =
    variant === 'next'
      ? 'w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-white/60'
      : 'ac-input min-h-[44px] w-full';

  const labelClass = variant === 'next' ? 'mb-1 block text-sm text-white/80' : 'mb-1 block text-sm ac-text-secondary';

  if (!schoolId || alevelClasses.length === 0) return null;
  if (anchorClassName !== undefined) {
    if (!anchorClassName.trim() || !isALevelClass(anchorClassName)) return null;
  }

  const setPaperCountAndDefaults = (n: 1 | 2 | 3) => {
    setPaperCount(n);
    setWeights(equalSplitWeights(n));
  };

  const setWeightAt = (index: number, raw: string) => {
    const v = parseFloat(raw);
    setWeights((prev) => {
      const next = [...prev];
      next[index] = Number.isFinite(v) ? v : 0;
      return next;
    });
  };

  const saveConfiguration = async () => {
    setError(null);
    if (!schoolId || !selectedSubject.trim()) return;
    if (!weightsValid) {
      setError(`Paper weights must add up to 100% (currently ${weightTotal.toFixed(2)}%).`);
      return;
    }
    if (weights.length !== paperCount) {
      setError('Weight count does not match number of papers.');
      return;
    }
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from('school_uace_class_subject_papers')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_name', UACE_PAPERS_STORAGE_CLASS)
        .eq('subject_name', selectedSubject.trim());
      if (delErr) throw delErr;

      const rows = weights.map((w, i) => ({
        school_id: schoolId,
        class_name: UACE_PAPERS_STORAGE_CLASS,
        subject_name: selectedSubject.trim(),
        paper_slot: i + 1,
        paper_label: `Paper ${i + 1}`,
        weight_percent: Number(Math.min(100, Math.max(0, w)).toFixed(2)),
        paper_code: null,
        sort_order: i,
        teacher_id: null,
      }));

      const { error: insErr } = await supabase.from('school_uace_class_subject_papers').insert(rows);
      if (insErr) throw insErr;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save papers');
    } finally {
      setSaving(false);
      void loadPapers();
    }
  };

  const clearConfiguration = async () => {
    setError(null);
    if (!schoolId || !selectedSubject.trim()) return;
    setSaving(true);
    try {
      const { error: delErr } = await supabase
        .from('school_uace_class_subject_papers')
        .delete()
        .eq('school_id', schoolId)
        .eq('class_name', UACE_PAPERS_STORAGE_CLASS)
        .eq('subject_name', selectedSubject.trim());
      if (delErr) throw delErr;
      setPaperCount(1);
      setWeights([100]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear papers');
    } finally {
      setSaving(false);
      void loadPapers();
    }
  };

  return (
    <div
      className={
        embedded
          ? 'mt-8 border-t border-slate-200/25 pt-6 dark:border-white/10'
          : 'mt-10 border-t border-[var(--pw-border)] pt-8 dark:border-white/10'
      }
    >
      <div className="mb-4">
        {!embedded && (
          <div className={variant === 'next' ? 'font-medium text-white' : 'ac-text-primary font-medium'}>
            UACE papers (A-Level)
          </div>
        )}
        <div className={variant === 'next' ? 'text-sm text-white/70' : 'ac-text-secondary text-sm'}>
          {embedded ? (
            <>
              <span className={variant === 'next' ? 'font-medium text-white' : 'font-medium ac-text-primary'}>
                A-Level paper split (optional).{' '}
              </span>
              Choose how many papers this subject uses (1–3) and set each paper&apos;s share of the final subject mark
              (must total 100%). Each paper is marked out of 100; the weighted combination is used for the subject
              percentage. Senior 5 and 6 share this configuration. Clear all papers to use a single exam line with no
              paper split (legacy).
            </>
          ) : (
            'Configure A-Level papers per subject: count, weights (sum 100%), optional single-line mode when cleared.'
          )}
        </div>
      </div>

      {error && (
        <div
          className={
            variant === 'next'
              ? 'mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100'
              : 'mb-3 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100'
          }
        >
          {error}
        </div>
      )}

      <div className={`p-4 sm:p-5 ${settingsInsetSurface}`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Level</label>
            <div
              className={
                variant === 'next'
                  ? `${inputClass} flex min-h-[44px] items-center text-white/90`
                  : `${inputClass} flex min-h-[44px] items-center ac-text-primary`
              }
            >
              A-Level
            </div>
          </div>
          <div>
            <label className={labelClass}>Subject</label>
            <select
              value={selectedSubject}
              disabled={loadingSubjects || subjectNames.length === 0}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setPaperCount(1);
                setWeights([100]);
              }}
              className={inputClass}
            >
              <option value="">Select subject</option>
              {subjectNames.map((s) => (
                <option key={s} value={s} className={variant === 'next' ? 'bg-slate-900 text-white' : ''}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Number of papers</label>
            <select
              value={paperCount}
              disabled={!selectedSubject.trim()}
              onChange={(e) => setPaperCountAndDefaults(Number(e.target.value) as 1 | 2 | 3)}
              className={inputClass}
              aria-label="Number of papers for this subject"
            >
              <option value={1}>1 paper</option>
              <option value={2}>2 papers</option>
              <option value={3}>3 papers</option>
            </select>
          </div>
        </div>

        {selectedSubject.trim() ? (
          <div className="mt-4 space-y-3">
            <div className={labelClass}>Weight of each paper in final subject % (sum = 100%)</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: paperCount }, (_, i) => (
                <div key={i}>
                  <label className={labelClass}>{`Paper ${i + 1}`}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={weights[i] ?? ''}
                      onChange={(e) => setWeightAt(i, e.target.value)}
                      className={inputClass}
                      aria-label={`Weight percent for paper ${i + 1}`}
                    />
                    <span className={variant === 'next' ? 'text-sm text-white/80' : 'ac-text-secondary text-sm'}>%</span>
                  </div>
                </div>
              ))}
            </div>
            <div
              className={
                weightsValid
                  ? variant === 'next'
                    ? 'text-sm text-emerald-300/90'
                    : 'text-sm text-emerald-600 dark:text-emerald-400'
                  : variant === 'next'
                    ? 'text-sm text-amber-200'
                    : 'text-sm text-amber-700 dark:text-amber-300'
              }
            >
              Total: {weightTotal.toFixed(2)}% {weightsValid ? '(valid)' : '— must be 100%'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!weightsValid || saving}
                onClick={() => void saveConfiguration()}
                className={
                  variant === 'next'
                    ? 'min-h-[44px] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50'
                    : `${settingsPrimaryActionClass}`
                }
              >
                {saving ? 'Saving…' : 'Save papers for this subject'}
              </button>
              <button
                type="button"
                disabled={saving || paperRows.length === 0}
                onClick={() => void clearConfiguration()}
                className={
                  variant === 'next'
                    ? 'min-h-[44px] rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50'
                    : 'min-h-[44px] rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] px-4 py-2 text-sm ac-text-primary disabled:opacity-50'
                }
              >
                Clear paper split (single line)
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {!selectedSubject.trim() ? (
          <div className={variant === 'next' ? 'text-sm text-white/70' : 'ac-text-secondary text-sm'}>
            Choose a subject to configure or review papers.
          </div>
        ) : loadingPapers ? (
          <div className={variant === 'next' ? 'text-sm text-white/70' : 'ac-text-secondary text-sm'}>
            Loading…
          </div>
        ) : paperRows.length === 0 ? (
          <div className={variant === 'next' ? 'text-sm text-white/70' : 'ac-text-secondary text-sm'}>
            No paper split configured — this subject uses a single exam line (teachers enter marks without choosing Paper
            1/2/3). Use the form above to add 1–3 papers if needed.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr
                  className={
                    variant === 'next'
                      ? 'border-b border-white/10 bg-white/5 text-left text-white/80'
                      : 'ac-text-primary border-b border-[var(--pw-border)] bg-[var(--pw-s2)] text-left'
                  }
                >
                  <th className="p-2">Paper</th>
                  <th className="p-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {paperRows.map((r) => (
                  <tr
                    key={r.id}
                    className={
                      variant === 'next'
                        ? 'border-b border-white/5 text-white'
                        : 'ac-text-primary border-b border-[var(--pw-border)]'
                    }
                  >
                    <td className="p-2 font-medium">{r.paper_label ?? `Paper ${r.paper_slot}`}</td>
                    <td className="p-2">{Number(r.weight_percent).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
