import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { resolveCurrentSchoolTerm } from '../../../lib/adminFinanceTerm';
import { sortExamSetsByTermProgression } from '../../../lib/teacherExamSetsInput';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import { useAcademicPeriod } from '../../../lib/academicPeriodTerminology';
import AdminPageWrapper from '../../../components/layout/AdminPageWrapper';
import PosEmptyState from '../../../components/finance/pos/PosEmptyState';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  X,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '../../../styles/posThemeTokens';

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
  const { data: userData } = await supabase
    .from('users')
    .select('school_id')
    .eq('user_id', userId)
    .single();
  const schoolId = userData?.school_id ?? null;
  if (!schoolId) return { examSets: [], currentTerm: null, schoolId: null, classOptions: [] };

  const { data: schoolData } = await supabase
    .from('schools')
    .select('type')
    .eq('school_id', schoolId)
    .single();

  let classOptions = classOptionsFromSchoolType((schoolData as any)?.type);

  // If school is tertiary or no classes returned from basic presets, query active streams / students
  if (classOptions.length === 0) {
    const { data: streamRows } = await supabase
      .from('class_streams')
      .select('class_name')
      .eq('school_id', schoolId);

    if (streamRows && streamRows.length > 0) {
      classOptions = Array.from(
        new Set(streamRows.map((r: any) => r.class_name).filter(Boolean))
      ).sort() as string[];
    } else {
      const { data: studentRows } = await supabase
        .from('students')
        .select('current_class')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .not('current_class', 'is', null);

      classOptions = Array.from(
        new Set((studentRows || []).map((r: any) => r.current_class).filter(Boolean))
      ).sort() as string[];
    }

    // Tertiary default fallback if still empty
    if (classOptions.length === 0) {
      classOptions = [
        'Year 1 Semester 1',
        'Year 1 Semester 2',
        'Year 2 Semester 1',
        'Year 2 Semester 2',
        'Year 3 Semester 1',
        'Year 3 Semester 2',
      ];
    }
  }

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
  const { data } = await q
    .order('year', { ascending: false })
    .order('term', { ascending: true })
    .order('name');

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
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { isTertiary, labels, formatPeriod } = useAcademicPeriod();
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setError(`Exam sets can only be created for the active ${labels.periodNoun.toLowerCase()}.`);
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
      active_for_input: true,
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
    setSuccessMsg(`Assessment "${payload.name}" created successfully.`);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'exam-sets', user!.id] });
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const deleteExamSet = async (id: string, setTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${setTitle}"?`)) return;
    setError(null);
    const { error: err } = await supabase.from('exam_sets').delete().eq('id', id);
    if (err) setError(err.message);
    else {
      setSuccessMsg('Assessment set deleted.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'exam-sets', user!.id] });
      setTimeout(() => setSuccessMsg(null), 3000);
    }
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
        setError('Cannot turn off — teachers have already entered marks.');
        return;
      }
    }
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('exam_sets')
      .update({ is_active: newActive, active_for_input: newActive })
      .eq('id', id)
      .select('id, is_active, active_for_input');
    if (err) {
      setError(err.message);
      return;
    }
    if (!rows?.length) {
      setError('Update failed. You may not have permission.');
      return;
    }
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
        setError('Cannot turn off — teachers have already entered marks.');
        return;
      }
    }
    setError(null);
    const { data: rows, error: err } = await supabase
      .from('exam_sets')
      .update({ active_for_input: newActive, is_active: newActive })
      .eq('id', id)
      .select('id, is_active, active_for_input');
    if (err) {
      setError(err.message);
      return;
    }
    if (!rows?.length) {
      setError('Update failed. You may not have permission.');
      return;
    }
    setExamSets((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, active_for_input: newActive, is_active: newActive } : e
      )
    );
  };

  const filteredSets = useMemo(() => {
    return sortExamSetsByTermProgression(
      currentTerm
        ? examSets.filter((e) => e.year === currentTerm.year && e.term === currentTerm.term)
        : examSets
    );
  }, [examSets, currentTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredSets.length;
    const activeCount = filteredSets.filter((e) => e.is_active).length;
    const openForInputCount = filteredSets.filter((e) => e.active_for_input).length;
    const classesCount = classOptions.length;
    return { total, activeCount, openForInputCount, classesCount };
  }, [filteredSets, classOptions]);

  // Presets for Quick Creation
  const presets = useMemo(() => {
    if (isTertiary) {
      return [
        'Continuous Assessment (CW)',
        'Mid-Semester Examination',
        'End of Semester Final',
        'Clinical OSCE Examination',
      ];
    }
    return [
      'Beginning of Term (BOT)',
      'Mid Term Examination (MOT)',
      'End of Term Examination (EOT)',
    ];
  }, [isTertiary]);

  return (
    <AdminPageWrapper
      title={`${labels.periodAssessments} Management`}
      subtitle={`Configure examination and continuous assessment series for the active ${labels.periodNoun.toLowerCase()}.`}
    >
      <div className="w-full space-y-6">
        {/* Alerts */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 4-Card Summary Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'emerald'),
              border: `1px solid ${isDark ? t.stroke : '#e2e8f0'}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: INTER }}>
                Active Series
              </span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
              {stats.activeCount}
            </p>
            <p className={`mt-1 text-xs font-medium ${isDark ? 'text-emerald-400/90' : 'text-emerald-700'}`}>
              Enabled assessment sets
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'blue'),
              border: `1px solid ${isDark ? t.stroke : '#e2e8f0'}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: INTER }}>
                Mark Entry Open
              </span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <Edit3 className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
              {stats.openForInputCount}
            </p>
            <p className={`mt-1 text-xs font-medium ${isDark ? 'text-blue-400/90' : 'text-blue-700'}`}>
              Open for teacher marks input
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'purple'),
              border: `1px solid ${isDark ? t.stroke : '#e2e8f0'}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: INTER }}>
                Academic Period
              </span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-2 text-lg font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
              {currentTerm ? formatPeriod(currentTerm.term, currentTerm.year) : 'All Periods'}
            </p>
            <p className={`mt-1 text-xs font-medium ${isDark ? 'text-purple-400/90' : 'text-purple-700'}`}>
              Active academic window
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'amber'),
              border: `1px solid ${isDark ? t.stroke : '#e2e8f0'}`,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`} style={{ fontFamily: INTER }}>
                Classes Available
              </span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
              {stats.classesCount}
            </p>
            <p className={`mt-1 text-xs font-medium ${isDark ? 'text-amber-400/90' : 'text-amber-700'}`}>
              Eligible class cohorts
            </p>
          </div>
        </div>

        {/* Create Exam Set Form Card */}
        <div
          className="rounded-2xl p-5 shadow-sm space-y-4"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${isDark ? t.stroke : '#e2e8f0'}`,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-teal-500/15 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                <Plus className="h-4 w-4" />
              </div>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
                Create New {labels.periodAssessments} Series
              </h3>
            </div>

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Presets:</span>
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] transition ${
                    isDark
                      ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Assessment Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. ${presets[0]}`}
                className={`w-full rounded-xl border px-3 py-2 text-xs ${isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                style={{ backgroundColor: t.fieldBg, borderColor: isDark ? t.stroke : '#cbd5e1' }}
              />
            </div>

            <div>
              <label className={`text-xs font-medium block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Description (Optional)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weighted 30% towards final semester grade"
                className={`w-full rounded-xl border px-3 py-2 text-xs ${isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                style={{ backgroundColor: t.fieldBg, borderColor: isDark ? t.stroke : '#cbd5e1' }}
              />
            </div>
          </div>

          {/* Class Cohorts Selection */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={allClasses}
                  onChange={(e) => {
                    setAllClasses(e.target.checked);
                    if (e.target.checked) setTargetClasses([]);
                  }}
                  className="rounded accent-emerald-500 h-4 w-4"
                />
                Apply to all institutional cohorts &amp; classes
              </label>
              {!allClasses && (
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {targetClasses.length} classes selected
                </span>
              )}
            </div>

            {!allClasses && classOptions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {classOptions.map((cls) => {
                  const isSelected = targetClasses.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? isDark
                            ? 'border-teal-500/50 bg-teal-500/20 text-teal-300 shadow-sm'
                            : 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm font-semibold'
                          : isDark
                            ? 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                            : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!schoolId || !name.trim() || saving || (!allClasses && targetClasses.length === 0)}
              onClick={saveExamSet}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {saving ? 'Creating…' : 'Create Assessment Series'}
            </button>
          </div>
        </div>

        {/* Exam Sets Register Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${isDark ? t.stroke : '#e2e8f0'}`,
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: SORA }}>
                Configured Assessment Sets ({filteredSets.length})
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Past and future periods are preserved; currently showing active period sets.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="p-8">
              <PosEmptyState
                icon={<FileSpreadsheet className="w-8 h-8 text-teal-400" />}
                title="No Assessment Sets Found"
                description={`Create an assessment series above to start recording ${labels.periodNoun.toLowerCase()} marks and grading student results.`}
                accentColor="mint"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                <thead>
                  <tr
                    className={`border-b text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                    style={{
                      backgroundColor: isDark ? t.fieldBg : '#f8fafc',
                      borderColor: isDark ? t.stroke : '#e2e8f0',
                    }}
                  >
                    <th className="py-3 px-4">Series Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Target Classes</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Mark Entry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                  {filteredSets.map((es) => (
                    <tr key={es.id} className={`transition ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                      <td className={`py-3.5 px-4 font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
                            <FileSpreadsheet className="h-4 w-4" />
                          </div>
                          <span>{es.name}</span>
                        </div>
                      </td>

                      <td className={`py-3.5 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {es.description || 'Standard series'}
                      </td>

                      <td className="py-3.5 px-4">
                        {Array.isArray(es.target_classes) && es.target_classes.length === 0 ? (
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-medium ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            All Classes
                          </span>
                        ) : (
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-medium ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                            {es.target_classes?.length ?? 0} Class
                            {(es.target_classes?.length ?? 0) !== 1 ? 'es' : ''}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleActive(es.id, es.is_active)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                            es.is_active
                              ? isDark
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : isDark
                                ? 'bg-white/5 text-slate-400 border border-white/10'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {es.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleActiveForInput(es.id, es.active_for_input)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                            es.active_for_input
                              ? isDark
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                : 'bg-teal-50 text-teal-800 border border-teal-300'
                              : isDark
                                ? 'bg-white/5 text-slate-400 border border-white/10'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {es.active_for_input ? 'OPEN' : 'CLOSED'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/dashboard/admin/exam-set-results?examSetId=${es.id}`
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                              isDark
                                ? 'border-teal-500/30 bg-teal-500/15 text-teal-300 hover:bg-teal-500/25'
                                : 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
                            }`}
                          >
                            <span>Results</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteExamSet(es.id, es.name)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition"
                            title="Delete Series"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
