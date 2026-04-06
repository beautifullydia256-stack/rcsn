import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import SectionHeader from './SectionHeader';

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

  const { data: termsData } = await supabase
    .from('school_terms')
    .select('*')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: true });
  const todayStr = new Date().toISOString().slice(0, 10);
  const current = (termsData || []).find(
    (r: { start_date?: string; end_date: string }) =>
      (r.start_date ? r.start_date <= todayStr && r.end_date >= todayStr : r.end_date >= todayStr)
  );
  const currentTerm = current ? { year: current.year, term: current.term } : null;

  if (currentTerm) {
    const hasCurrentYear = examSets.some((es) => es.year === currentTerm.year);
    if (!hasCurrentYear) {
      const { data: previousYear, error: prevErr } = await supabase
        .from('exam_sets')
        .select('*')
        .eq('school_id', schoolId)
        .eq('year', currentTerm.year - 1)
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
}: {
  classOptions: string[];
  schoolId: string | null;
  schoolType: 'Nursery/Primary' | 'Secondary' | null;
}) {
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

  const loading = isLoading;

  const saveExamSet = async () => {
    setError(null);
    if (!schoolId || !name.trim()) return;
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
    setTerm(1);
    setYear(new Date().getFullYear());
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
      if (isPrevious) {
        setError('Cannot delete exam sets for previous terms.');
        return;
      }
    }
    if (!confirm('Are you sure you want to delete this exam set?')) return;
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
      if (isPrevious) {
        setError('Cannot modify exam sets for previous terms.');
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
        setError('Cannot turn off exam set. Teachers have already input results.');
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
      if (isPrevious) {
        setError('Cannot modify exam sets for previous terms.');
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

  const filteredSets = currentTerm
    ? examSets.filter((es) => es.year === currentTerm.year)
    : examSets;
  const targetClassesArr = (es: ExamSet) =>
    Array.isArray(es.target_classes) ? es.target_classes : [];

  return (
    <div>
      <SectionHeader
        eyebrow="Exams"
        title="Exam Sets Management"
        desc={`Create different exam sets for your school. Showing exam sets for ${currentTerm?.year ?? 'current year'}.`}
      />

      <div className="ac-glass-card mb-6 rounded-lg border border-[var(--ac-border)] p-4">
        <h3 className="ac-text-primary mb-3 font-medium">Create New Exam Set</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exam Set Name (e.g., Beginning of Term)"
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
            className="ac-input rounded-lg px-3 py-2"
          >
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
          <input
            type="number"
            min={2020}
            max={2099}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="ac-input rounded-lg px-3 py-2"
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
          className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:bg-emerald-500 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          {saving ? 'Creating...' : 'Create Exam Set'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="ac-text-secondary mb-3 text-sm">
        Current Exam Sets ({currentTerm?.year ?? 'Current Year'})
      </div>
      <div className="ac-glass-card overflow-x-auto rounded-xl border border-[var(--ac-border)]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--ac-border)] text-left">
              <th className="ac-text-muted px-4 py-2">Name</th>
              <th className="ac-text-muted px-4 py-2">Description</th>
              <th className="ac-text-muted px-4 py-2">Term</th>
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
                  No exam sets created for {currentTerm?.year ?? 'this year'} yet.
                </td>
              </tr>
            ) : (
              filteredSets.map((es) => (
                <tr key={es.id} className="border-t border-[var(--ac-border)]">
                  <td className="ac-text-primary px-4 py-2 font-medium">{es.name}</td>
                  <td className="ac-text-secondary px-4 py-2">{es.description || '-'}</td>
                  <td className="ac-text-secondary px-4 py-2">Term {es.term}</td>
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
