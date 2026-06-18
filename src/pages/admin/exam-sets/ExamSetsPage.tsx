import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { resolveCurrentSchoolTerm } from '../../../lib/adminFinanceTerm';
import { sortExamSetsByTermProgression } from '../../../lib/teacherExamSetsInput';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

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

function classOptionsFromSchoolType(type: string | null | undefined): string[] {
  if (type === 'Nursery/Primary') {
    const opts: string[] = ['Baby Class', 'Middle Class', 'Top Class'];
    for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    return opts;
  }
  if (type === 'Secondary') {
    const opts: string[] = [];
    for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    return opts;
  }
  return [];
}

export async function fetchExamSets(userId: string): Promise<{
  examSets: ExamSet[];
  currentTerm: { year: number; term: number } | null;
  schoolId: string | null;
  classOptions: string[];
}> {
  const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  const schoolId = userData?.school_id ?? null;
  if (!schoolId) return { examSets: [], currentTerm: null, schoolId: null, classOptions: [] };

  const { data: schoolData } = await supabase.from('schools').select('type').eq('school_id', schoolId).single();
  const classOptions = classOptionsFromSchoolType((schoolData as any)?.type);

  const todayStr = new Date().toISOString().slice(0, 10);
  const engine = await resolveCurrentSchoolTerm(supabase, schoolId, todayStr);
  const currentTerm =
    engine?.year != null && engine.term != null ? { year: engine.year, term: engine.term } : null;

  let q = supabase
    .from('exam_sets')
    .select('id, name, description, term, year, target_classes, is_active, active_for_input')
    .eq('school_id', schoolId);
  if (currentTerm) {
    q = q.eq('year', currentTerm.year).eq('term', currentTerm.term);
  }
  const { data } = await q.order('year', { ascending: false }).order('term', { ascending: true }).order('name');

  return {
    examSets: sortExamSetsByTermProgression(data || []),
    currentTerm,
    schoolId,
    classOptions,
  };
}

export default function ExamSetsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [currentTerm, setCurrentTerm] = useState<{ year: number; term: number } | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'exam-sets', user?.id ?? ''],
    queryFn: () => fetchExamSets(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (data) {
      setExamSets(data.examSets);
      setCurrentTerm(data.currentTerm);
      setSchoolId(data.schoolId);
      setClassOptions(data.classOptions);
    }
  }, [data]);

  useEffect(() => {
    if (currentTerm) {
      setTerm(currentTerm.term);
      setYear(currentTerm.year);
    }
  }, [currentTerm?.year, currentTerm?.term]);

  const toggleClass = (cls: string) => {
    setTargetClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const saveExamSet = async () => {
    setError(null);
    if (!schoolId || !name.trim()) return;
    if (currentTerm && (year !== currentTerm.year || term !== currentTerm.term)) {
      setError('Exam sets can only be created for the current term.');
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
    if (insertError) { setError(insertError.message); return; }
    setName('');
    setDescription('');
    setTerm(currentTerm?.term ?? 1);
    setYear(currentTerm?.year ?? new Date().getFullYear());
    setTargetClasses([]);
    setAllClasses(false);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'exam-sets', user!.id] });
  };

  const deleteExamSet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam set?')) return;
    setError(null);
    const { error: err } = await supabase.from('exam_sets').delete().eq('id', id);
    if (err) setError(err.message);
    else await queryClient.invalidateQueries({ queryKey: ['admin', 'exam-sets', user!.id] });
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const es = examSets.find((e) => e.id === id);
    if (!es) return;
    const newActive = !currentActive;
    if (!newActive && es.active_for_input) {
      const { data: results } = await supabase
        .from('exam_results')
        .select('id')
        .eq('exam_set_id', id)
        .limit(1);
      if (results?.length) {
        setError('Cannot turn off — teachers have already entered results.');
        return;
      }
    }
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('exam_sets')
      .update({ is_active: newActive, active_for_input: newActive })
      .eq('id', id)
      .select('id, is_active, active_for_input');
    if (err) { setError(err.message); return; }
    if (!rows?.length) { setError('Update failed. You may not have permission.'); return; }
    setExamSets((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_active: newActive, active_for_input: newActive } : e))
    );
  };

  const toggleActiveForInput = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive;
    if (currentActive) {
      const { data: results } = await supabase
        .from('exam_results')
        .select('id')
        .eq('exam_set_id', id)
        .limit(1);
      if (results?.length) {
        setError('Cannot turn off — teachers have already entered results.');
        return;
      }
    }
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('exam_sets')
      .update({ active_for_input: newActive, is_active: newActive })
      .eq('id', id)
      .select('id, is_active, active_for_input');
    if (err) { setError(err.message); return; }
    if (!rows?.length) { setError('Update failed. You may not have permission.'); return; }
    setExamSets((prev) =>
      prev.map((e) => (e.id === id ? { ...e, active_for_input: newActive, is_active: newActive } : e))
    );
  };

  const filteredSets = sortExamSetsByTermProgression(
    currentTerm
      ? examSets.filter((e) => e.year === currentTerm.year && e.term === currentTerm.term)
      : examSets
  );

  return (
    <AdminPageWrapper
      eyebrow="Exams"
      title="Exam Sets"
      subtitle={`Exam sets for the current term only${currentTerm ? ` (Term ${currentTerm.term} ${currentTerm.year})` : ''}. Past and future terms are hidden.`}
    >
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} mb-6 p-4 sm:p-5`}>
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
            disabled={!!currentTerm}
            title={currentTerm ? 'Locked to the current term' : undefined}
            className="ac-input rounded-lg px-3 py-2 disabled:opacity-60"
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
          {!allClasses && classOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {classOptions.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => toggleClass(cls)}
                  className={`rounded-lg border px-3 py-1 text-sm transition-colors ${
                    targetClasses.includes(cls)
                      ? 'border-emerald-400/80 bg-emerald-600/90 text-white shadow-sm shadow-emerald-900/20'
                      : 'border-[var(--ac-border)] bg-[var(--ac-card-bg)] ac-text-primary hover:bg-[var(--ac-sidebar-active-bg)]'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        <button
          type="button"
          disabled={!schoolId || !name.trim() || saving || (!allClasses && targetClasses.length === 0)}
          onClick={saveExamSet}
          className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Creating...' : 'Create Exam Set'}
        </button>
      </div>

      <div className={`${adminCardClass} overflow-x-auto`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--ac-border)] border-t-[var(--ac-text-primary)]" />
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="py-12 text-center ac-text-muted">No exam sets yet. Use the form above to create one.</div>
        ) : (
          <div className="ac-table-wrap rounded-xl border border-[var(--ac-border)] overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-card-bg)] text-left">
                  <th className="px-4 py-2 font-medium ac-text-muted">Name</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Description</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Classes</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Active</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Input</th>
                  <th className="px-4 py-2 font-medium ac-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSets.map((es) => (
                  <tr
                    key={es.id}
                    className="border-b border-[var(--ac-border)] hover:bg-[var(--ac-sidebar-active-bg)]"
                  >
                    <td className="px-4 py-2 ac-text-primary font-medium">{es.name}</td>
                    <td className="px-4 py-2 ac-text-secondary">{es.description || '—'}</td>
                    <td className="px-4 py-2 ac-text-secondary">
                      {Array.isArray(es.target_classes) && es.target_classes.length === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">All Classes</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">
                          {es.target_classes?.length ?? 0} class
                          {(es.target_classes?.length ?? 0) !== 1 ? 'es' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(es.id, es.is_active)}
                        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                          es.is_active
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
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
                            ? 'bg-teal-600 text-white hover:bg-teal-500'
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
                        className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-400 hover:scale-105 transition-transform"
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
    </AdminPageWrapper>
  );
}
