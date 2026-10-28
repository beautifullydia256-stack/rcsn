import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';
import { sortExamSetsByTermProgression } from '@/lib/teacherExamSetsInput';
import SectionHeader from './SectionHeader';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';
import { useAcademicPeriod } from '@/lib/academicPeriodTerminology';
import { GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

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
    <div className="space-y-4">
      <SectionHeader
        embedded={embedded}
        eyebrow={labels.periodAssessments}
        title={`${labels.periodAssessments} Management`}
      />

      <div className="gov-card rounded-lg border border-[#CCCCCC] bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CCCCCC] pb-3">
          <div className="text-[12px] font-mono font-bold uppercase text-[#111111]">
            CONFIGURE NEW {labels.periodAssessments === 'Exam Sets' ? 'EXAMINATION SERIES' : 'ASSESSMENT'}
          </div>
          {isTertiary && (
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'CAT 1', desc: 'Continuous Assessment 1 (Coursework)' },
                { label: 'CAT 2', desc: 'Continuous Assessment 2 (Coursework)' },
                { label: 'End of Sem Exam', desc: 'Internal End of Semester Examination' },
                { label: 'OSCE Clinical', desc: 'Objective Structured Clinical Examination' },
                { label: 'UHPAB Qualifying', desc: 'UHPAB Board Qualifying Examination' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setName(preset.label);
                    setDescription(preset.desc);
                  }}
                  className="gov-btn gov-btn-sm"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
              ASSESSMENT TITLE *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isTertiary ? "Assessment Name (e.g., Continuous Assessment 1)" : "Exam Set Name (e.g., Beginning of Term)"}
              className="gov-input w-full text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
              NOTE / DESCRIPTION (OPTIONAL)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="gov-input w-full text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
              ACADEMIC PERIOD / TERM
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(parseInt(e.target.value, 10))}
              disabled={!!currentTerm}
              title={currentTerm ? `Locked to the current ${labels.periodNoun.toLowerCase()}` : undefined}
              className="gov-select w-full text-xs disabled:opacity-60"
            >
              <option value={1}>{formatPeriod(1)}</option>
              <option value={2}>{formatPeriod(2)}</option>
              <option value={3}>{formatPeriod(3)}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-[#555555] mb-1">
              ACADEMIC YEAR
            </label>
            <input
              type="number"
              min={2020}
              max={2099}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              disabled={!!currentTerm}
              title={currentTerm ? 'Locked to the current academic year' : undefined}
              className="gov-input w-full text-xs font-mono disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-mono font-bold text-[#222222] cursor-pointer">
            <input
              type="checkbox"
              checked={allClasses}
              onChange={(e) => {
                setAllClasses(e.target.checked);
                if (e.target.checked) setTargetClasses([]);
              }}
              className="accent-[#111111]"
            />
            APPLY TO ALL COHORTS / CLASSES
          </label>
          {!allClasses && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {classOptions.map((className) => (
                <button
                  key={className}
                  type="button"
                  onClick={() => toggleClass(className)}
                  className={`gov-btn gov-btn-sm ${
                    targetClasses.includes(className) ? 'gov-btn-primary' : ''
                  }`}
                >
                  {className}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-[#CCCCCC]">
          <button
            type="button"
            disabled={
              !schoolId || !name.trim() || saving || (!allClasses && targetClasses.length === 0)
            }
            onClick={saveExamSet}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            {saving ? 'COMMITTING…' : `CREATE ${labels.periodAssessments === 'Exam Sets' ? 'EXAM SET' : 'ASSESSMENT'}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-[#EF4444] bg-[#FEF2F2] px-3 py-2 text-xs font-mono font-bold text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="text-xs font-mono font-bold uppercase text-[#555555]">
          CURRENT {labels.periodNoun.toUpperCase()} {labels.periodAssessments.toUpperCase()}
          {currentTerm ? ` (${formatPeriod(currentTerm.term, currentTerm.year, { includeYearComma: false })})` : ''}
        </div>
      </div>

      <div className="gov-table-container">
        <table className="gov-table w-full text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">SERIES NAME</th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">DESCRIPTION</th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">{labels.periodNoun.toUpperCase()}</th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">YEAR</th>
              <th className="px-3 py-2 text-left font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">COHORTS</th>
              <th className="px-3 py-2 text-center font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">STATUS</th>
              <th className="px-3 py-2 text-center font-mono uppercase text-[10px] text-[#555555] border-r border-[#CCCCCC]">INPUT STATUS</th>
              <th className="px-3 py-2 text-right font-mono uppercase text-[10px] text-[#555555]">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <GovTableLoader colSpan={8} />
            ) : filteredSets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-xs font-mono text-[#666666]">
                  NO {labels.periodAssessments.toUpperCase()} CONFIGURED FOR CURRENT {labels.periodNoun.toUpperCase()}.
                </td>
              </tr>
            ) : (
              filteredSets.map((es) => (
                <tr key={es.id} className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB]">
                  <td className="px-3 py-2 font-bold text-[#111111] uppercase font-sans border-r border-[#CCCCCC]">
                    {es.name}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#555555] border-r border-[#CCCCCC]">
                    {es.description || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#111111] border-r border-[#CCCCCC]">
                    {formatPeriod(es.term)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#111111] border-r border-[#CCCCCC]">
                    {es.year}
                  </td>
                  <td className="px-3 py-2 font-mono border-r border-[#CCCCCC]">
                    {targetClassesArr(es).length === 0 ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] rounded">
                        ALL COHORTS
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#EAEAEA] text-[#333333] border border-[#CCCCCC] rounded">
                        {targetClassesArr(es).length} COHORT{targetClassesArr(es).length !== 1 ? 'S' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center border-r border-[#CCCCCC]">
                    <button
                      type="button"
                      onClick={() => toggleActive(es.id, es.is_active)}
                      className={`gov-btn gov-btn-sm ${es.is_active ? 'gov-btn-primary' : ''}`}
                    >
                      {es.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center border-r border-[#CCCCCC]">
                    <button
                      type="button"
                      onClick={() => toggleActiveForInput(es.id, es.active_for_input)}
                      className={`gov-btn gov-btn-sm ${es.active_for_input ? 'gov-btn-primary' : ''}`}
                    >
                      {es.active_for_input ? 'INPUT OPEN' : 'CLOSED'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => deleteExamSet(es.id)}
                      className="gov-btn gov-btn-sm text-[#B91C1C] hover:bg-[#FEF2F2]"
                    >
                      DELETE
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
