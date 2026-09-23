import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import { sortExamSetsByTermProgression } from '@/lib/teacherExamSetsInput';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';
import { useAcademicPeriod } from '@/lib/academicPeriodTerminology';

const STALE_TIME_MS = 5 * 60 * 1000;

type ExamSet = {
  id: string;
  name: string;
  description: string | null;
  term: number;
  year: number;
  target_classes: string[];
  is_active: boolean;
  active_for_input: boolean;
};

async function fetchExamSetsPage(schoolId: string): Promise<{
  examSets: ExamSet[];
  currentTerm: { year: number; term: number } | null;
}> {
  const { data, error: err } = await supabase
    .from('exam_sets')
    .select('*')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name');
  if (err) throw err;
  const examSets = data || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const engine = await resolveCurrentSchoolTerm(supabase, schoolId, todayStr);
  const currentTerm =
    engine?.year != null && engine.term != null ? { year: engine.year, term: engine.term } : null;

  if (currentTerm) {
    const hasCurrentTermSets = examSets.some(
      (es) => es.year === currentTerm.year && es.term === currentTerm.term
    );
    if (!hasCurrentTermSets) {
      const { data: previousYear, error: prevErr } = await supabase
        .from('exam_sets')
        .select('*')
        .eq('school_id', schoolId)
        .eq('year', currentTerm.year - 1)
        .eq('term', currentTerm.term)
        .order('term', { ascending: true });
      if (!prevErr && previousYear?.length) {
        const newSets = previousYear.map((es: ExamSet & { target_classes?: string[] }) => ({
          school_id: schoolId,
          name: es.name,
          description: es.description,
          term: es.term,
          year: currentTerm.year,
          target_classes: es.target_classes || [],
          is_active: false,
          active_for_input: false,
        }));
        await supabase.from('exam_sets').insert(newSets);
        const { data: updated } = await supabase
          .from('exam_sets')
          .select('*')
          .eq('school_id', schoolId)
          .order('year', { ascending: false })
          .order('term', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('name');
        return { examSets: updated || [], currentTerm };
      }
    }
  }
  return { examSets, currentTerm };
}

export default function SettingsExamSets({
  classOptions,
  schoolId,
  schoolType,
  embedded,
}: {
  classOptions: string[];
  schoolId: string | null;
  schoolType?: string | null;
  embedded?: boolean;
}) {
  const { labels, formatPeriod, isTertiary } = useAcademicPeriod();
  const queryClient = useQueryClient();
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState<{ year: number; term: number } | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings', 'examSets', schoolId ?? ''],
    queryFn: () => fetchExamSetsPage(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (data) {
      setExamSets(data.examSets);
      setCurrentTerm(data.currentTerm);
    }
  }, [data]);

  useEffect(() => {
    if (currentTerm) {
      setTerm(currentTerm.term);
      setYear(currentTerm.year);
    }
  }, [currentTerm?.year, currentTerm?.term]);

  const loading = isLoading;

  const saveExamSet = async () => {
    setError(null);
    if (!schoolId || !name.trim()) return;
    if (currentTerm && (year !== currentTerm.year || term !== currentTerm.term)) {
      setError(`Assessments can only be created for the current ${labels.periodNoun.toLowerCase()}.`);
      return;
    }
    setSaving(true);
    const payload = {
      school_id: schoolId,
      name: name.trim(),
      description: description.trim() || null,
      term,
      year,
      target_classes: allClasses ? [] : targetClasses,
      is_active: true,
    };
    const { error: insertError } = await supabase.from('exam_sets').insert(payload);
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName('');
    setDescription('');
    setTerm(currentTerm?.term ?? 1);
    setYear(currentTerm?.year ?? new Date().getFullYear());
    setTargetClasses([]);
    setAllClasses(false);
    const { data } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name');
    setExamSets(data || []);
  };

  const toggleClass = (className: string) => {
    setTargetClasses((prev) =>
      prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className]
    );
  };

  const deleteExamSet = async (id: string) => {
    const examSet = examSets.find((es) => es.id === id);
    if (!examSet) return;
    if (currentTerm) {
      const isPrevious =
        examSet.year < currentTerm.year ||
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      const isFuture =
        examSet.year > currentTerm.year ||
        (examSet.year === currentTerm.year && examSet.term > currentTerm.term);
      if (isPrevious) {
        setError(`Cannot delete assessments for previous ${labels.periodNounPlural.toLowerCase()}.`);
        return;
      }
      if (isFuture) {
        setError(`Cannot delete assessments for future ${labels.periodNounPlural.toLowerCase()}.`);
        return;
      }
    }
    if (!confirm(`Are you sure you want to delete this ${labels.periodAssessments === 'Exam Sets' ? 'exam set' : 'assessment'}?`)) return;
    const { error: err } = await supabase.from('exam_sets').delete().eq('id', id);
    if (err) setError(err.message);
    else await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'examSets', schoolId] });
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const examSet = examSets.find((es) => es.id === id);
    if (!examSet) return;
    if (currentTerm) {
      const isPrevious =
        examSet.year < currentTerm.year ||
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      const isFuture =
        examSet.year > currentTerm.year ||
        (examSet.year === currentTerm.year && examSet.term > currentTerm.term);
      if (isPrevious) {
        setError(`Cannot modify assessments for previous ${labels.periodNounPlural.toLowerCase()}.`);
        return;
      }
      if (isFuture) {
        setError(`Cannot modify assessments for future ${labels.periodNounPlural.toLowerCase()}.`);
        return;
      }
    }
    const newActive = !currentActive;
    if (!newActive && examSet.active_for_input) {
      const { data: results } = await supabase
        .from('exam_results')
        .select('id')
        .eq('exam_set_id', id)
        .limit(1);
      if (results?.length) {
        setError(`Cannot turn off assessment. ${isTertiary ? 'Tutors' : 'Teachers'} have already input results.`);
        return;
      }
    }
    setError(null);
    const { data: updatedRows, error: err } = await supabase
      .from('exam_sets')
      .update({ is_active: newActive, active_for_input: newActive })
      .eq('id', id)
      .select('id, is_active, active_for_input');
    if (err) {
      setError(err.message);
      return;
    }
    if (!updatedRows?.length) {
      setError('Update failed. You may not have permission to change this exam set, or it was deleted.');
      return;
    }
    setExamSets((prev) =>
      prev.map((es) => (es.id === id ? { ...es, is_active: newActive, active_for_input: newActive } : es))
    );
    await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'examSets', schoolId] });
  };

  const toggleActiveForInput = async (id: string, currentActive: boolean) => {
    const examSet = examSets.find((es) => es.id === id);
    if (!examSet) return;
    if (currentTerm) {
      const isPrevious =
        examSet.year < currentTerm.year ||
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      const isFuture =
        examSet.year > currentTerm.year ||
        (examSet.year === currentTerm.year && examSet.term > currentTerm.term);
      if (isPrevious) {
        setError('Cannot modify exam sets for previous terms.');
        return;
      }
      if (isFuture) {
        setError('Cannot modify exam sets for future terms.');
        return;
      }
    }
    const newActive = !currentActive;
    if (currentActive) {
      const { data: results } = await supabase
        .from('exam_results')
        .select('id')
        .eq('exam_set_id', id)
        .limit(1);
      if (results?.length) {
        setError('Cannot turn off exam set. Teachers have already input results.');
        return;
      }
    }
    const { data: updatedRows, error: err } = await supabase
      .from('exam_sets')
      .update({ active_for_input: newActive, is_active: newActive })
      .eq('id', id)
      .select('id, is_active, active_for_input');
    if (err) setError(err.message);
    else if (!updatedRows?.length) setError('Update failed. You may not have permission.');
    else {
      setExamSets((prev) =>
        prev.map((es) => (es.id === id ? { ...es, active_for_input: newActive, is_active: newActive } : es))
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'examSets', schoolId] });
    }
  };

  const filteredSets = sortExamSetsByTermProgression(
    currentTerm
      ? examSets.filter((es) => es.year === currentTerm.year && es.term === currentTerm.term)
      : examSets
  );
  const targetClassesArr = (es: ExamSet) =>
    Array.isArray(es.target_classes) ? es.target_classes : [];

  return (
    <div>
      <SectionHeader
        embedded={embedded}
        eyebrow={labels.periodAssessments}
        title={`${labels.periodAssessments} Management`}
        desc={`${labels.periodAssessments} for the current ${labels.periodNoun.toLowerCase()} only (${currentTerm ? formatPeriod(currentTerm.term, currentTerm.year, { includeYearComma: false }) : `calendar ${labels.periodNoun.toLowerCase()}`}). Past and future ${labels.periodNounPlural.toLowerCase()} are hidden.`}
      />

      <div className={`${settingsInsetSurface} ac-glass-card mb-6 p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="ac-text-primary font-medium">Create New {labels.periodAssessments === 'Exam Sets' ? 'Exam Set' : 'Assessment'}</h3>
          {isTertiary && (
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'CAT 1', desc: 'Continuous Assessment 1 (Coursework)' },
                { label: 'CAT 2', desc: 'Continuous Assessment 2 (Coursework)' },
                { label: 'End of Sem Exam', desc: 'Internal End of Semester Examination' },
                { label: 'OSCE Clinical', desc: 'Objective Structured Clinical Examination' },
                { label: 'UNMEB Qualifying', desc: 'UNMEB Board Qualifying Examination' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setName(preset.label);
                    setDescription(preset.desc);
                  }}
                  className="rounded-md border border-slate-300 dark:border-white/10 bg-white/50 dark:bg-white/5 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 transition-colors"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isTertiary ? "Assessment Name (e.g., Continuous Assessment 1)" : "Exam Set Name (e.g., Beginning of Term)"}
            className="ac-input rounded-lg px-3 py-2"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="ac-input rounded-lg px-3 py-2"
          />
          <select
            value={term}
            onChange={(e) => setTerm(parseInt(e.target.value, 10))}
            disabled={!!currentTerm}
            title={currentTerm ? `Locked to the current ${labels.periodNoun.toLowerCase()}` : undefined}
            className="ac-input rounded-lg px-3 py-2 disabled:opacity-60"
          >
            <option value={1}>{formatPeriod(1)}</option>
            <option value={2}>{formatPeriod(2)}</option>
            <option value={3}>{formatPeriod(3)}</option>
          </select>
          <input
            type="number"
            min={2020}
            max={2099}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            disabled={!!currentTerm}
            title={currentTerm ? 'Locked to the current academic year' : undefined}
            className="ac-input rounded-lg px-3 py-2 disabled:opacity-60"
          />
        </div>
        <div className="mt-3">
          <label className="ac-text-secondary mb-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allClasses}
              onChange={(e) => {
                setAllClasses(e.target.checked);
                if (e.target.checked) setTargetClasses([]);
              }}
              className="accent-emerald-500"
            />
            Apply to all classes
          </label>
          {!allClasses && (
            <div className="flex flex-wrap gap-2">
              {classOptions.map((className) => (
                <button
                  key={className}
                  type="button"
                  onClick={() => toggleClass(className)}
                  className={`rounded-lg border px-3 py-1 text-sm transition-colors ${
                    targetClasses.includes(className)
                      ? 'border-emerald-400/80 bg-emerald-600/90 text-white shadow-sm shadow-emerald-900/20'
                      : 'border-[var(--ac-border)] bg-[var(--ac-card-bg)] ac-text-primary hover:bg-[var(--ac-sidebar-active-bg)]'
                  }`}
                >
                  {className}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={
            !schoolId || !name.trim() || saving || (!allClasses && targetClasses.length === 0)
          }
          onClick={saveExamSet}
          className={`${settingsPrimaryActionClass} mt-3`}
        >
          {saving ? 'Creating...' : `Create ${labels.periodAssessments === 'Exam Sets' ? 'Exam Set' : 'Assessment'}`}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="ac-text-secondary mb-3 text-sm">
        Current {labels.periodNoun.toLowerCase()} {labels.periodAssessments.toLowerCase()}
        {currentTerm ? ` (${formatPeriod(currentTerm.term, currentTerm.year, { includeYearComma: false })})` : ''}
      </div>
      <div className={`${settingsInsetSurface} ac-glass-card overflow-x-auto`}>
        <table className="min-w-full min-w-[720px] text-sm md:min-w-0">
          <thead>
            <tr className="border-b border-[var(--ac-border)] text-left">
              <th className="ac-text-muted px-4 py-2">Name</th>
              <th className="ac-text-muted px-4 py-2">Description</th>
              <th className="ac-text-muted px-4 py-2">{labels.periodNoun}</th>
              <th className="ac-text-muted px-4 py-2">Year</th>
              <th className="ac-text-muted px-4 py-2">Classes</th>
              <th className="ac-text-muted px-4 py-2">Status</th>
              <th className="ac-text-muted px-4 py-2">Active for Input</th>
              <th className="ac-text-muted px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-[var(--ac-sidebar-active-bg)]/50">
            {loading ? (
              <tr>
                <td colSpan={8} className="ac-text-muted px-4 py-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : filteredSets.length === 0 ? (
              <tr>
                <td colSpan={8} className="ac-text-muted px-4 py-6 text-center">
                  No {labels.periodAssessments.toLowerCase()} for the current {labels.periodNoun.toLowerCase()} yet.
                </td>
              </tr>
            ) : (
              filteredSets.map((es) => (
                <tr key={es.id} className="border-t border-[var(--ac-border)]">
                  <td className="ac-text-primary px-4 py-2 font-medium">{es.name}</td>
                  <td className="ac-text-secondary px-4 py-2">{es.description || '-'}</td>
                  <td className="ac-text-secondary px-4 py-2">{formatPeriod(es.term)}</td>
                  <td className="ac-text-secondary px-4 py-2">{es.year}</td>
                  <td className="ac-text-secondary px-4 py-2">
                    {targetClassesArr(es).length === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">All Classes</span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400">
                        {targetClassesArr(es).length} class
                        {targetClassesArr(es).length !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(es.id, es.is_active)}
                      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                        es.is_active
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500'
                          : 'border border-[var(--ac-border)] bg-[var(--ac-sidebar-active-bg)] ac-text-secondary hover:ac-text-primary'
                      }`}
                    >
                      {es.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => toggleActiveForInput(es.id, es.active_for_input)}
                      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                        es.active_for_input
                          ? 'bg-teal-600 text-white hover:bg-teal-500 dark:bg-teal-500'
                          : 'border border-[var(--ac-border)] bg-[var(--ac-sidebar-active-bg)] ac-text-secondary hover:ac-text-primary'
                      }`}
                    >
                      {es.active_for_input ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => deleteExamSet(es.id)}
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:scale-105 hover:bg-red-400 transition-transform"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
