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

/** Draft strings for papers 1..(n−1); paper n is always 100% minus the sum of these (shown read-only). */
function equalSplitDraftsForFirstPapers(count: 1 | 2 | 3): string[] {
  if (count === 1) return [];
  const nums = equalSplitWeights(count);
  if (count === 2) return [String(nums[0])];
  return [String(nums[0]), String(nums[1])];
}

function draftLooksLikePartialNumber(value: string): boolean {
  return value === '' || /^\d*\.?\d*$/.test(value);
}

function draftStringFromStoredWeight(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n * 100) / 100);
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
  /** Editable % for Paper 1 .. Paper (n−1). Last paper is computed so total = 100%. */
  const [weightDrafts, setWeightDrafts] = useState<string[]>([]);
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
        const clamped = (n >= 3 ? 3 : n >= 2 ? 2 : 1) as 1 | 2 | 3;
        setPaperCount(clamped);
        if (clamped === 1) {
          setWeightDrafts([]);
        } else {
          setWeightDrafts(
            sorted.slice(0, clamped - 1).map((r) => draftStringFromStoredWeight(Number(r.weight_percent))),
          );
        }
      } else {
        setPaperCount(1);
        setWeightDrafts([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load papers');
      setPaperRows([]);
      setPaperCount(1);
      setWeightDrafts([]);
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

  const editablePaperCount = paperCount > 1 ? paperCount - 1 : 0;

  const sumEditableParsed = useMemo(() => {
    return weightDrafts.slice(0, editablePaperCount).reduce((acc, s) => {
      const v = parseFloat(s);
      return acc + (Number.isFinite(v) ? v : 0);
    }, 0);
  }, [weightDrafts, editablePaperCount]);

  const remainderPercent = useMemo(() => {
    const r = 100 - sumEditableParsed;
    return Math.round(r * 100) / 100;
  }, [sumEditableParsed]);

  const weightsValid =
    paperCount === 1 ||
    (sumEditableParsed <= 100 + WEIGHT_SUM_TOLERANCE && remainderPercent >= -WEIGHT_SUM_TOLERANCE);

  const overflowEditable = sumEditableParsed > 100 + WEIGHT_SUM_TOLERANCE;

  const buildWeightsToSave = (): number[] => {
    if (paperCount === 1) return [100];
    const first = weightDrafts.slice(0, paperCount - 1).map((s) => {
      const v = parseFloat(s);
      return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
    });
    const last = Number((100 - first.reduce((a, b) => a + b, 0)).toFixed(2));
    return [...first, Math.max(0, last)];
  };

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
    setWeightDrafts(equalSplitDraftsForFirstPapers(n));
  };

  const setWeightDraftAt = (index: number, raw: string) => {
    if (!draftLooksLikePartialNumber(raw)) return;
    setWeightDrafts((prev) => {
      const next = prev.length >= editablePaperCount ? [...prev] : equalSplitDraftsForFirstPapers(paperCount);
      while (next.length < editablePaperCount) next.push('');
      next[index] = raw;
      return next;
    });
  };

  const saveConfiguration = async () => {
    setError(null);
    if (!schoolId || !selectedSubject.trim()) return;
    if (overflowEditable) {
      setError(
        `The editable papers add up to ${sumEditableParsed.toFixed(2)}%, which is over 100%. Reduce a value so the last paper can fill the remainder.`,
      );
      return;
    }
    if (!weightsValid || remainderPercent < -WEIGHT_SUM_TOLERANCE) {
      setError('Paper weights must add up to 100%. Check the values you entered.');
      return;
    }
    const weights = buildWeightsToSave();
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
      setWeightDrafts([]);
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
                setWeightDrafts([]);
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
            <div className={labelClass}>
              Weight of each paper in final subject % (total 100%).{' '}
              {paperCount === 2 ? (
                <>
                  Edit <strong className="font-medium">Paper 1</strong>;{' '}
                  <strong className="font-medium">Paper 2</strong> is the remainder (100% − Paper 1).
                </>
              ) : paperCount === 3 ? (
                <>
                  Edit <strong className="font-medium">Papers 1 and 2</strong>;{' '}
                  <strong className="font-medium">Paper 3</strong> is the remainder so the three always sum to 100%.
                </>
              ) : null}
            </div>
            {paperCount === 1 ? (
              <div
                className={
                  variant === 'next'
                    ? 'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85'
                    : 'rounded-lg border border-[var(--pw-border)] bg-[var(--pw-s2)] px-3 py-2 text-sm ac-text-primary'
                }
              >
                One paper uses <strong className="font-medium">100%</strong> of the subject mark (no split).
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: paperCount - 1 }, (_, i) => (
                  <div key={i}>
                    <label className={labelClass}>{`Paper ${i + 1}`}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={weightDrafts[i] ?? ''}
                        onChange={(e) => setWeightDraftAt(i, e.target.value)}
                        className={inputClass}
                        placeholder="e.g. 20"
                        aria-label={`Weight percent for paper ${i + 1}`}
                      />
                      <span className={variant === 'next' ? 'text-sm text-white/80' : 'ac-text-secondary text-sm'}>
                        %
                      </span>
                    </div>
                  </div>
                ))}
                <div>
                  <label className={labelClass}>{`Paper ${paperCount} (auto)`}</label>
                  <div
                    className={
                      variant === 'next'
                        ? `${inputClass} flex min-h-[44px] items-center text-white/90`
                        : `${inputClass} flex min-h-[44px] items-center ac-text-primary`
                    }
                    aria-live="polite"
                  >
                    {overflowEditable ? '—' : `${remainderPercent.toFixed(2)}%`}
                  </div>
                  <p
                    className={
                      variant === 'next' ? 'mt-1 text-xs text-white/55' : 'mt-1 text-xs ac-text-secondary'
                    }
                  >
                    {overflowEditable
                      ? 'Reduce the values above — they cannot exceed 100% in total.'
                      : `100% − (${sumEditableParsed.toFixed(2)}% above) = ${remainderPercent.toFixed(2)}%`}
                  </p>
                </div>
              </div>
            )}
            <div
              className={
                weightsValid && !overflowEditable
                  ? variant === 'next'
                    ? 'text-sm text-emerald-300/90'
                    : 'text-sm text-emerald-600 dark:text-emerald-400'
                  : variant === 'next'
                    ? 'text-sm text-amber-200'
                    : 'text-sm text-amber-700 dark:text-amber-300'
              }
            >
              {paperCount === 1
                ? 'Total: 100% (single paper).'
                : overflowEditable
                  ? `Total would exceed 100% (you entered ${sumEditableParsed.toFixed(2)}% across editable papers).`
                  : `Total: ${(sumEditableParsed + (overflowEditable ? 0 : remainderPercent)).toFixed(2)}% ${weightsValid ? '(valid)' : '— fix values'}`}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!weightsValid || saving || overflowEditable || (paperCount > 1 && remainderPercent < 0)}
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
