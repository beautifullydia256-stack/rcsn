import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isALevelClass } from '../reports/templates/helpers';
import { settingsInsetSurface, settingsPrimaryActionClass } from '@/pages/admin/settings/tabs/settingsTabStyles';
import type { SchoolUaceClassSubjectPaperRow } from '../../lib/uaceClassSubjectPapers';
import { fetchUacePapersForClassSubject } from '../../lib/uaceClassSubjectPapers';

type Variant = 'vite' | 'next';

export default function SettingsUaceClassSubjectPapers({
  classOptions,
  schoolId,
  variant = 'vite',
  embedded,
  /** When set (e.g. from Subjects per class), class is fixed and dropdown hidden. Parent should only mount when this is Senior 5–6. */
  anchorClassName,
}: {
  classOptions: string[];
  schoolId: string | null;
  variant?: Variant;
  /** When true, shell already shows section title—only show helper copy. */
  embedded?: boolean;
  anchorClassName?: string;
}) {
  const alevelClasses = useMemo(() => classOptions.filter((c) => isALevelClass(c)), [classOptions]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectNames, setSubjectNames] = useState<string[]>([]);
  const [paperRows, setPaperRows] = useState<SchoolUaceClassSubjectPaperRow[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [paperCode, setPaperCode] = useState('');
  const [paperLabel, setPaperLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    if (!schoolId || !selectedClass) {
      setSubjectNames([]);
      return;
    }
    setLoadingSubjects(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('class_subjects')
        .select('subject')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .order('subject');
      if (qErr) throw qErr;
      setSubjectNames((data || []).map((r) => r.subject as string));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subjects');
      setSubjectNames([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, [schoolId, selectedClass]);

  const loadPapers = useCallback(async () => {
    if (!schoolId || !selectedClass || !selectedSubject) {
      setPaperRows([]);
      return;
    }
    setLoadingPapers(true);
    setError(null);
    try {
      const rows = await fetchUacePapersForClassSubject(schoolId, selectedClass, selectedSubject);
      setPaperRows(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load papers');
      setPaperRows([]);
    } finally {
      setLoadingPapers(false);
    }
  }, [schoolId, selectedClass, selectedSubject]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    void loadPapers();
  }, [loadPapers]);

  useEffect(() => {
    if (anchorClassName === undefined) return;
    if (!anchorClassName.trim() || !isALevelClass(anchorClassName)) return;
    setSelectedClass(anchorClassName);
    setSelectedSubject('');
  }, [anchorClassName]);

  const inputClass =
    variant === 'next'
      ? 'w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-white/60'
      : 'ac-input min-h-[44px] w-full';

  const labelClass = variant === 'next' ? 'mb-1 block text-sm text-white/80' : 'mb-1 block text-sm ac-text-secondary';

  if (!schoolId || alevelClasses.length === 0) return null;
  if (anchorClassName !== undefined) {
    if (!anchorClassName.trim() || !isALevelClass(anchorClassName)) return null;
  }

  const addPaper = async () => {
    setError(null);
    if (!schoolId || !selectedClass || !selectedSubject) return;
    const code = paperCode.trim();
    if (!code) {
      setError('Paper code is required (e.g. P250/1).');
      return;
    }
    setSaving(true);
    const payload = {
      school_id: schoolId,
      class_name: selectedClass,
      subject_name: selectedSubject.trim(),
      paper_code: code,
      paper_label: paperLabel.trim() || null,
      sort_order: 0,
      teacher_id: null,
    };
    const { error: insErr } = await supabase.from('school_uace_class_subject_papers').insert(payload);
    setSaving(false);
    if (insErr) {
      setError(insErr.message || 'Failed to add paper');
      return;
    }
    setPaperCode('');
    setPaperLabel('');
    void loadPapers();
  };

  const removePaper = async (row: SchoolUaceClassSubjectPaperRow) => {
    setError(null);
    const { error: delErr } = await supabase.from('school_uace_class_subject_papers').delete().eq('id', row.id);
    if (delErr) {
      setError(delErr.message || 'Failed to delete');
      return;
    }
    void loadPapers();
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
            UACE papers (Senior 5–6)
          </div>
        )}
        <div
          className={
            variant === 'next' ? 'text-sm text-white/70' : 'ac-text-secondary text-sm'
          }
        >
          {embedded ? (
            <>
              <span className={variant === 'next' ? 'font-medium text-white' : 'font-medium ac-text-primary'}>
                UACE papers (Senior 5–6).{' '}
              </span>
              Configure UNEB-style paper codes per class and subject.
            </>
          ) : (
            'Configure UNEB-style paper codes per class and subject.'
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Class (A-Level)</label>
          {anchorClassName !== undefined ? (
            <div
              className={
                variant === 'next'
                  ? `${inputClass} flex min-h-[44px] items-center text-white/90`
                  : `${inputClass} flex min-h-[44px] items-center ac-text-primary`
              }
            >
              {anchorClassName}
            </div>
          ) : (
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSubject('');
              }}
              className={inputClass}
            >
              <option value="">Select class</option>
              {alevelClasses.map((c) => (
                <option key={c} value={c} className={variant === 'next' ? 'bg-slate-900 text-white' : ''}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className={labelClass}>Subject</label>
          <select
            value={selectedSubject}
            disabled={!selectedClass || loadingSubjects}
            onChange={(e) => setSelectedSubject(e.target.value)}
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
          <label className={labelClass}>Paper code (UNEB)</label>
          <input
            value={paperCode}
            onChange={(e) => setPaperCode(e.target.value)}
            placeholder="e.g. P250/1"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Label (optional)</label>
          <input
            value={paperLabel}
            onChange={(e) => setPaperLabel(e.target.value)}
            placeholder="Paper 1"
            className={inputClass}
          />
        </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={!selectedClass || !selectedSubject || saving}
            onClick={() => void addPaper()}
            className={
              variant === 'next'
                ? 'min-h-[44px] w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 sm:w-auto'
                : `${settingsPrimaryActionClass} w-full sm:w-auto`
            }
          >
            {saving ? 'Saving…' : 'Add paper'}
          </button>
        </div>
      </div>

      <div className="mt-6">
        {!selectedClass || !selectedSubject ? (
          <div className={variant === 'next' ? 'text-sm text-white/70' : 'ac-text-secondary text-sm'}>
            Choose class and subject to list configured papers.
          </div>
        ) : loadingPapers ? (
          <div className={variant === 'next' ? 'text-sm text-white/70' : 'ac-text-secondary text-sm'}>
            Loading papers…
          </div>
        ) : paperRows.length === 0 ? (
          <div className={variant === 'next' ? 'text-sm text-white/70' : 'ac-text-secondary text-sm'}>
            No papers yet. Add at least one for multi-paper subjects, or teachers can use the free “paper” text field
            only.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr
                  className={
                    variant === 'next'
                      ? 'border-b border-white/10 bg-white/5 text-left text-white/80'
                      : 'ac-text-primary border-b border-[var(--pw-border)] bg-[var(--pw-s2)] text-left'
                  }
                >
                  <th className="p-2">Code</th>
                  <th className="p-2">Label</th>
                  <th className="w-20 p-2" />
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
                    <td className="p-2 font-medium">{r.paper_code}</td>
                    <td className="p-2">{r.paper_label ?? '—'}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => void removePaper(r)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </td>
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
