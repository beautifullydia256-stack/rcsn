import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { resolveCurrentSchoolTerm } from '../../../lib/adminFinanceTerm';
import { sortExamSetsByTermProgression } from '../../../lib/teacherExamSetsInput';
import { useAuthStore } from '../../../store/authStore';
import { useAcademicPeriod } from '../../../lib/academicPeriodTerminology';
import NativeModal from '../../../components/NativeModal';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Check,
  Lock,
  Unlock,
} from 'lucide-react';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
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
  }

  const { data: sets } = await supabase
    .from('exam_sets')
    .select('id, name, description, term, year, target_classes, is_active, active_for_input')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: false })
    .order('created_at', { ascending: false });

  const currentTerm = await resolveCurrentSchoolTerm(supabase, schoolId);

  return {
    examSets: (sets ?? []).map((s) => ({
      ...s,
      target_classes: Array.isArray(s.target_classes) ? s.target_classes : [],
      is_active: s.is_active ?? true,
      active_for_input: s.active_for_input ?? true,
    })),
    currentTerm: currentTerm && currentTerm.year != null && currentTerm.term != null ? { year: currentTerm.year, term: currentTerm.term } : null,
    schoolId,
    classOptions,
  };
}

export default function ExamSetsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { labels, formatPeriod, isTertiary } = useAcademicPeriod();

  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [currentTerm, setCurrentTerm] = useState<{ year: number; term: number } | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'exam-sets', user?.id ?? ''],
    queryFn: () => (user?.id ? fetchExamSets(user.id) : null),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (data) {
      setExamSets(data.examSets);
      setCurrentTerm(data.currentTerm);
      setSchoolId(data.schoolId);
      setClassOptions(data.classOptions);
      if (data.currentTerm) {
        setTerm(data.currentTerm.term);
        setYear(data.currentTerm.year);
      }
    }
  }, [data]);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Assessment title is required.');
      return;
    }
    if (!schoolId) {
      setError('School account context missing.');
      return;
    }
    setSaving(true);
    setError(null);
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
    setShowModal(false);
    setSuccessMsg(`Assessment series "${payload.name}" configured successfully.`);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'exam-sets', user!.id] });
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const deleteExamSet = async (id: string, setTitle: string) => {
    if (!confirm(`Are you sure you want to delete assessment series "${setTitle}"?`)) return;
    setError(null);
    const { error: err } = await supabase.from('exam_sets').delete().eq('id', id);
    if (err) setError(err.message);
    else {
      setSuccessMsg('Assessment set deleted.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'exam-sets', user!.id] });
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const toggleActiveForInput = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive;
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
    setExamSets((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, active_for_input: newActive, is_active: newActive } : e
      )
    );
  };

  const filteredSets = useMemo(() => {
    const sorted = sortExamSetsByTermProgression(
      currentTerm
        ? examSets.filter((e) => e.year === currentTerm.year && e.term === currentTerm.term)
        : examSets
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((s) => s.name.toLowerCase().includes(q));
  }, [examSets, currentTerm, search]);

  const stats = useMemo(() => {
    const total = filteredSets.length;
    const activeCount = filteredSets.filter((e) => e.is_active).length;
    const openForInputCount = filteredSets.filter((e) => e.active_for_input).length;
    const classesCount = classOptions.length;
    return { total, activeCount, openForInputCount, classesCount };
  }, [filteredSets, classOptions]);

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            {labels.periodAssessments.toUpperCase()} REGISTRY
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            SEMESTER EXAMS, CONTINUOUS ASSESSMENT &amp; OSCE EVALUATIONS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW ASSESSMENT SET</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="border border-rose-300 bg-rose-50 p-3 text-xs font-mono text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="border border-emerald-300 bg-emerald-50 p-3 text-xs font-mono text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ASSESSMENT SERIES
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ACTIVE {labels.periodNoun} SCOPE
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            OPEN FOR MARKS ENTRY
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {stats.openForInputCount.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            FACULTY SUBMISSION UNLOCKED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            LOCKED / CONCLUDED
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {(stats.total - stats.openForInputCount).toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            GRADE PORTAL CLOSED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            CAMPUS COHORTS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.classesCount.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            REGISTERED STREAMS
          </div>
        </div>
      </div>

      {/* ── 3. CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#555555]">
            CURRENT CYCLE:
          </span>
          <span className="text-xs font-mono font-bold text-[#111111] bg-[#F1F3F5] px-2 py-0.5 border border-[#CCCCCC]">
            {currentTerm ? formatPeriod(currentTerm.term, currentTerm.year, { short: false }) : 'ALL PERIODS'}
          </span>
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search assessment series…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gov-input text-xs font-mono w-full"
          />
        </div>
      </div>

      {/* ── 4. DATA TABLE ── */}
      <div className="gov-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="gov-table w-full text-left">
            <thead>
              <tr>
                <th>ASSESSMENT SERIES</th>
                <th>PERIOD / ACADEMIC YEAR</th>
                <th>TARGET COHORTS / STREAMS</th>
                <th>FACULTY MARKS ENTRY</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <GovTableLoader colSpan={6} message="AUDITING SEMESTER ASSESSMENT SERIES..." />
              ) : filteredSets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-xs font-mono text-[#777777]">
                    NO ASSESSMENT SERIES CONFIGURED FOR THIS ACADEMIC CYCLE
                  </td>
                </tr>
              ) : (
                filteredSets.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="font-bold text-xs text-[#111111]">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-[#555555] shrink-0" />
                        <div>
                          <div>{s.name}</div>
                          {s.description && (
                            <div className="text-[10px] font-mono text-[#777777] font-normal">{s.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-[#555555]">
                      {formatPeriod(s.term, s.year, { short: true })}
                    </td>
                    <td className="text-xs">
                      {s.target_classes.length === 0 ? (
                        <span className="font-mono text-[11px] text-[#555555] bg-[#F8F9FA] px-1.5 py-0.5 border border-[#E5E7EB]">
                          All Cohorts &amp; Streams
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-[#111111] font-semibold">
                          {s.target_classes.join(', ')}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleActiveForInput(s.id, s.active_for_input)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border ${
                          s.active_for_input
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                            : 'border-zinc-300 bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {s.active_for_input ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-zinc-500" />}
                        <span>{s.active_for_input ? 'ENTRY UNLOCKED' : 'ENTRY LOCKED'}</span>
                      </button>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        s.is_active
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                          : 'border-zinc-300 bg-zinc-100 text-zinc-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                        {s.is_active ? 'ACTIVE' : 'ARCHIVED'}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/admin/exam-results?exam_set_id=${s.id}`)}
                          className="gov-btn gov-btn-sm"
                        >
                          BROADSHEET
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteExamSet(s.id, s.name)}
                          className="gov-btn gov-btn-sm text-rose-700 hover:text-rose-900"
                          title="Delete Assessment Set"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. NEW ASSESSMENT MODAL ── */}
      {showModal && (
        <NativeModal
          isOpen={true}
          onClose={() => setShowModal(false)}
          title="CONFIGURE NEW ASSESSMENT SERIES"
          subtitle="Define official examination, continuous assessment, or clinical evaluation set."
          icon={FileSpreadsheet}
          size="lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#555555] mb-1 font-semibold">
                Fast Institutional Presets:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setName(p)}
                    className="gov-btn gov-btn-sm text-[11px] py-1"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. End of Semester Final Examination"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="gov-input w-full font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Academic {labels.periodNoun} *
                </label>
                <select
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                  className="gov-select w-full font-mono text-xs"
                >
                  <option value={1}>{labels.periodNoun} 1</option>
                  <option value={2}>{labels.periodNoun} 2</option>
                  <option value={3}>{labels.periodNoun} 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Academic Year *
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="gov-input w-full font-mono text-xs"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                  Internal Description / Memo (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weighted 40% Continuous Assessment, UNMEB syllabus verified"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="gov-input w-full font-mono text-xs"
                />
              </div>
            </div>

            {/* Target Cohorts Checklist */}
            <div className="border border-[#CCCCCC] p-3 bg-[#F8F9FA] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono uppercase tracking-wider text-[#333333] font-semibold">
                  Target Cohorts &amp; Classes
                </label>
                <label className="flex items-center gap-1.5 text-xs font-mono text-[#111111] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allClasses}
                    onChange={(e) => {
                      setAllClasses(e.target.checked);
                      if (e.target.checked) setTargetClasses([]);
                    }}
                    className="accent-[#111111]"
                  />
                  <span>Apply to All Campus Cohorts</span>
                </label>
              </div>

              {!allClasses && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2 border-t border-[#E5E7EB]">
                  {classOptions.map((c) => (
                    <label key={c} className="flex items-center gap-1.5 text-xs font-mono text-[#333333] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetClasses.includes(c)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTargetClasses((prev) => [...prev, c]);
                          } else {
                            setTargetClasses((prev) => prev.filter((item) => item !== c));
                          }
                        }}
                        className="accent-[#111111]"
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="gov-btn gov-btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
              >
                {saving ? <GovRollingBox size="sm" /> : <Check className="w-3.5 h-3.5" />}
                <span>Authorize &amp; Register Series</span>
              </button>
            </div>
          </form>
        </NativeModal>
      )}
    </div>
  );
}
