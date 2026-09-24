import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Layers,
  Award,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  Loader2,
  Save,
  Sliders,
  Download,
  Printer,
  X,
  RefreshCw,
  Clock,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useTeacherContext } from '../useTeacherContext';
import {
  TertiaryGradeBand,
  TertiaryAssessmentScheme,
  TraineeAssessmentRow,
  DEFAULT_TERTIARY_GRADE_BANDS,
  DEFAULT_TERTIARY_SCHEME,
  fetchTertiaryGradingBands,
  fetchTertiaryAssessmentScheme,
  saveTertiaryAssessmentScheme,
  calculateTertiaryMarkRow,
  fetchCohortAssessmentData,
  saveTraineeAssessment,
} from '@/features/tertiary/services/tertiaryAssessmentService';

export default function TertiaryContinuousAssessmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { classEncoded, subjectEncoded } = useParams<{ classEncoded?: string; subjectEncoded?: string }>();

  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const schoolId = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const { teacherId, classesWithSubjects } = useTeacherContext();

  const selectedClass = classEncoded ? decodeURIComponent(classEncoded) : '';
  const initialSubject = subjectEncoded ? decodeURIComponent(subjectEncoded) : '';

  const [currentSubject, setCurrentSubject] = useState(initialSubject);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'distinction' | 'credit' | 'pass' | 'retake'>('all');
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);

  // Local grid rows state for responsive typing without UI stutter
  const [rows, setRows] = useState<TraineeAssessmentRow[]>([]);
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(new Set());
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Editable Assessment Scheme Modal State
  const [schemeDraft, setSchemeDraft] = useState<TertiaryAssessmentScheme>(DEFAULT_TERTIARY_SCHEME);

  // 1. Fetch Assessment Scheme (weights & pass mark)
  const { data: assessmentScheme = DEFAULT_TERTIARY_SCHEME, isLoading: schemeLoading } = useQuery({
    queryKey: ['tertiary', 'assessment-scheme', schoolId ?? ''],
    queryFn: () => fetchTertiaryAssessmentScheme(schoolId!),
    enabled: !!schoolId,
  });

  // 2. Fetch Grading Bands
  const { data: gradingBands = DEFAULT_TERTIARY_GRADE_BANDS, isLoading: bandsLoading } = useQuery({
    queryKey: ['tertiary', 'grading-bands', schoolId ?? ''],
    queryFn: () => fetchTertiaryGradingBands(schoolId!),
    enabled: !!schoolId,
  });

  // 3. Fetch Assigned Course Units for this Cohort
  const { data: cohortSubjects = [] } = useQuery({
    queryKey: ['tertiary', 'cohort-subjects', schoolId ?? '', selectedClass],
    queryFn: async () => {
      if (!schoolId || !selectedClass) return [];
      const { data } = await supabase
        .from('teacher_class_subjects')
        .select('subject, stream_name')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass);
      const unique = Array.from(new Set((data || []).map((r: { subject: string }) => r.subject))).sort();
      return unique;
    },
    enabled: !!schoolId && !!selectedClass,
  });

  // Set default subject if not provided or if current subject is not in list
  useEffect(() => {
    if (!currentSubject && cohortSubjects.length > 0) {
      setCurrentSubject(cohortSubjects[0]);
    }
  }, [cohortSubjects, currentSubject]);

  // Sync draft scheme when loaded
  useEffect(() => {
    setSchemeDraft(assessmentScheme);
  }, [assessmentScheme]);

  // 4. Fetch Trainees and their Results for selected Cohort & Course Unit
  const { data: serverRows = [], isLoading: rowsLoading, refetch } = useQuery({
    queryKey: ['tertiary', 'cohort-assessment-rows', schoolId ?? '', selectedClass, currentSubject],
    queryFn: () =>
      fetchCohortAssessmentData(schoolId!, selectedClass, currentSubject, gradingBands, assessmentScheme),
    enabled: !!schoolId && !!selectedClass && !!currentSubject,
  });

  // Sync server rows to local editable state when loaded or refreshed
  useEffect(() => {
    if (serverRows.length > 0 && dirtyRowIds.size === 0) {
      setRows(serverRows);
    }
  }, [serverRows]);

  // Debounce Auto-save Timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time mark input handler
  const handleScoreChange = useCallback(
    (studentId: string, field: 'test1' | 'test2' | 'exam_score', rawValue: string) => {
      const parsed = rawValue.trim() === '' ? null : Math.max(0, Math.min(100, Number(rawValue)));

      setRows((prev) =>
        prev.map((row) => {
          if (row.student_id !== studentId) return row;

          const updatedTest1 = field === 'test1' ? parsed : row.test1;
          const updatedTest2 = field === 'test2' ? parsed : row.test2;
          const updatedExam = field === 'exam_score' ? parsed : row.exam_score;

          // Reactive calculation
          const computed = calculateTertiaryMarkRow(
            updatedTest1,
            updatedTest2,
            updatedExam,
            gradingBands,
            assessmentScheme
          );

          return {
            ...row,
            test1: updatedTest1,
            test2: updatedTest2,
            cat_score: computed.cat_score,
            exam_score: updatedExam,
            final_score: computed.final_score,
            grade: computed.grade,
            grade_point: computed.grade_point,
            remarks: computed.remarks,
            is_retake: computed.is_retake,
          };
        })
      );

      setDirtyRowIds((prev) => new Set(prev).add(studentId));

      // Trigger debounced auto-save (800ms after user pauses typing)
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        saveStudentScore(studentId);
      }, 800);
    },
    [gradingBands, assessmentScheme]
  );

  // Single Student Save Function
  const saveStudentScore = async (studentId: string) => {
    const targetRow = rows.find((r) => r.student_id === studentId);
    if (!targetRow || !schoolId || !selectedClass || !currentSubject) return;

    setSavingRows((prev) => new Set(prev).add(studentId));
    try {
      const resultId = await saveTraineeAssessment(
        schoolId,
        teacherId,
        selectedClass,
        currentSubject,
        targetRow
      );
      setRows((prev) =>
        prev.map((r) => (r.student_id === studentId ? { ...r, result_id: resultId } : r))
      );
      setDirtyRowIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Failed to save assessment score:', err);
    } finally {
      setSavingRows((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  // Bulk Save All Dirty Rows
  const saveAllDirtyRows = async () => {
    if (dirtyRowIds.size === 0) return;
    const idsToSave = Array.from(dirtyRowIds);
    for (const id of idsToSave) {
      await saveStudentScore(id);
    }
  };

  // Save Assessment Scheme Mutation
  const saveSchemeMutation = useMutation({
    mutationFn: async (scheme: TertiaryAssessmentScheme) => {
      if (!schoolId) throw new Error('Missing school ID');
      await saveTertiaryAssessmentScheme(schoolId, scheme);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tertiary', 'assessment-scheme', schoolId ?? ''] });
      setIsSchemeModalOpen(false);
      // Recalculate local rows with new scheme
      setRows((prev) =>
        prev.map((r) => {
          const comp = calculateTertiaryMarkRow(r.test1, r.test2, r.exam_score, gradingBands, schemeDraft);
          return {
            ...r,
            cat_score: comp.cat_score,
            final_score: comp.final_score,
            grade: comp.grade,
            grade_point: comp.grade_point,
            remarks: comp.remarks,
            is_retake: comp.is_retake,
          };
        })
      );
    },
  });

  // Export UNMEB Broadsheet CSV
  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const headers = [
      'No',
      'Admission No',
      'Trainee Name',
      'Cohort',
      'Course Unit',
      `Test 1`,
      `Test 2 / Practical`,
      `CAT Score (${assessmentScheme.catWeight}%)`,
      `Final Exam (${assessmentScheme.examWeight}%)`,
      'Final Mark (100%)',
      'Letter Grade',
      'Grade Point (GP)',
      'Academic Standing',
    ];

    const csvRows = rows.map((r, idx) => [
      idx + 1,
      `"${r.admission_number}"`,
      `"${r.name}"`,
      `"${selectedClass}"`,
      `"${currentSubject}"`,
      r.test1 ?? '',
      r.test2 ?? '',
      r.cat_score ?? '',
      r.exam_score ?? '',
      r.final_score ?? '',
      r.grade,
      r.grade_point.toFixed(1),
      `"${r.remarks}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `UNMEB_Continuous_Assessment_${selectedClass.replace(/[^a-zA-Z0-9]/g, '_')}_${currentSubject.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        !searchQuery.trim() ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.admission_number.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'distinction') return r.grade === 'A';
      if (statusFilter === 'credit') return r.grade === 'B+' || r.grade === 'B';
      if (statusFilter === 'pass') return ['C+', 'C', 'D+', 'D'].includes(r.grade);
      if (statusFilter === 'retake') return r.is_retake;
      return true;
    });
  }, [rows, searchQuery, statusFilter]);

  // Live Performance KPI Computations
  const totalEnrolled = rows.length;
  const capturedCount = rows.filter((r) => r.final_score !== null).length;
  const capturePct = totalEnrolled > 0 ? Math.round((capturedCount / totalEnrolled) * 100) : 0;

  const validFinalScores = rows.map((r) => r.final_score).filter((s): s is number => s !== null);
  const classAverage =
    validFinalScores.length > 0
      ? Math.round((validFinalScores.reduce((a, b) => a + b, 0) / validFinalScores.length) * 10) / 10
      : 0;

  const passCount = rows.filter((r) => r.final_score !== null && !r.is_retake).length;
  const passRate = capturedCount > 0 ? Math.round((passCount / capturedCount) * 100) : 0;

  const distinctionCount = rows.filter((r) => r.grade === 'A').length;
  const creditCount = rows.filter((r) => r.grade === 'B+' || r.grade === 'B').length;
  const passGradeCount = rows.filter((r) => ['C+', 'C', 'D+', 'D'].includes(r.grade)).length;
  const retakeCount = rows.filter((r) => r.is_retake).length;

  const isLoading = schemeLoading || bandsLoading || rowsLoading;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" style={{ color: t.textPrimary }}>
      {/* Executive Header Banner */}
      <div
        className="rounded-2xl p-6 border transition-all shadow-sm"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ background: 'rgba(59, 130, 246, 0.15)', color: t.brandBlue }}
            >
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider"
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    borderColor: 'rgba(16, 185, 129, 0.25)',
                    color: '#10b981',
                  }}
                >
                  Higher Institution Continuous Assessment
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider"
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    borderColor: 'rgba(59, 130, 246, 0.25)',
                    color: t.brandBlue,
                  }}
                >
                  UNMEB 5.0 Scale
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: t.textPrimary }}>
                {selectedClass || 'Continuous Assessment & Mark Entry'}
              </h1>
              <p className="text-xs font-semibold mt-0.5" style={{ color: t.textMuted }}>
                Input coursework, tests, practical OSCE, and semester exam marks. Grade points and standings are computed live.
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsSchemeModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>Assessment Weights ({assessmentScheme.catWeight}/{assessmentScheme.examWeight})</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <Printer className="w-4 h-4 text-indigo-500" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/teacher/exam-results')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Course Unit Selector Row */}
        <div
          className="mt-5 pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ borderColor: t.border }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider shrink-0" style={{ color: t.textMuted }}>
              Course Unit:
            </span>
            {cohortSubjects.length > 0 ? (
              <div className="relative inline-block w-full sm:w-auto">
                <select
                  value={currentSubject}
                  onChange={(e) => setCurrentSubject(e.target.value)}
                  className="rounded-xl px-4 py-2 text-xs font-bold border outline-none pr-9 appearance-none shadow-sm cursor-pointer"
                  style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
                >
                  {cohortSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            ) : (
              <span className="text-xs font-medium italic" style={{ color: t.textMuted }}>
                {initialSubject || 'No course units assigned'}
              </span>
            )}
          </div>

          {/* Auto-Save & Status Pill */}
          <div className="flex items-center gap-3 text-xs font-semibold">
            {dirtyRowIds.size > 0 && (
              <button
                type="button"
                onClick={saveAllDirtyRows}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all active:scale-95 cursor-pointer shadow-sm"
                style={{ background: t.brandBlue }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes ({dirtyRowIds.size})</span>
              </button>
            )}

            {savingRows.size > 0 ? (
              <span className="flex items-center gap-1 text-blue-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving marks…</span>
              </span>
            ) : lastSavedAt ? (
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All saved ({lastSavedAt.toLocaleTimeString()})</span>
              </span>
            ) : (
              <span className="flex items-center gap-1" style={{ color: t.textMuted }}>
                <Clock className="w-3.5 h-3.5" />
                <span>Auto-save active</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trainees */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Enrolled Trainees
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {totalEnrolled} Trainees
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Active cohort strength
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Capture Completion Rate */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="w-full mr-3">
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Captured Rate
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              {capturedCount} / {totalEnrolled} ({capturePct}%)
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${capturePct}%`, background: '#10b981' }}
              />
            </div>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Course Unit Average */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Course Unit Average
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandGold }}>
              {classAverage > 0 ? `${classAverage}%` : '–'}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Overall trainee mean score
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
          >
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Pass Rate */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Pass Rate (≥ 50%)
            </span>
            <div
              className="text-2xl font-black mt-1"
              style={{ color: passRate >= 80 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444' }}
            >
              {passRate}%
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {passCount} passed / {retakeCount} retakes
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
            style={{
              background: passRate >= 50 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: passRate >= 50 ? '#10b981' : '#ef4444',
            }}
          >
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grade Performance Filter Pills */}
      <div
        className="rounded-2xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: statusFilter === 'all' ? t.brandBlue : t.surface,
              borderColor: statusFilter === 'all' ? t.brandBlue : t.border,
              color: statusFilter === 'all' ? '#ffffff' : t.textMuted,
            }}
          >
            All Trainees ({rows.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('distinction')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer"
            style={{
              background: statusFilter === 'distinction' ? 'rgba(16, 185, 129, 0.2)' : t.surface,
              borderColor: statusFilter === 'distinction' ? '#10b981' : t.border,
              color: statusFilter === 'distinction' ? '#10b981' : t.textMuted,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Distinction A ({distinctionCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('credit')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer"
            style={{
              background: statusFilter === 'credit' ? 'rgba(59, 130, 246, 0.2)' : t.surface,
              borderColor: statusFilter === 'credit' ? t.brandBlue : t.border,
              color: statusFilter === 'credit' ? t.brandBlue : t.textMuted,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Credit B+/B ({creditCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pass')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer"
            style={{
              background: statusFilter === 'pass' ? 'rgba(245, 158, 11, 0.2)' : t.surface,
              borderColor: statusFilter === 'pass' ? '#f59e0b' : t.border,
              color: statusFilter === 'pass' ? '#f59e0b' : t.textMuted,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Pass C/D ({passGradeCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('retake')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer"
            style={{
              background: statusFilter === 'retake' ? 'rgba(239, 68, 68, 0.2)' : t.surface,
              borderColor: statusFilter === 'retake' ? '#ef4444' : t.border,
              color: statusFilter === 'retake' ? '#ef4444' : t.textMuted,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Retake F ({retakeCount})</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trainee name or reg number…"
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          />
        </div>
      </div>

      {/* Continuous Assessment Trainee Grid */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: t.border }}>
          <div>
            <h2 className="text-sm font-black" style={{ color: t.textPrimary }}>
              Official Mark Entry Sheet: {currentSubject}
            </h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
              Test 1 & Test 2 / Practical scale to CAT ({assessmentScheme.catWeight}%), Final Exam scales to ({assessmentScheme.examWeight}%).
            </p>
          </div>
          <div className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg border bg-black/5 dark:bg-white/5" style={{ borderColor: t.border }}>
            {filteredRows.length} Trainees Shown
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3" style={{ color: t.textMuted }}>
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm font-semibold">Loading continuous assessment roster…</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center" style={{ color: t.textMuted }}>
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
            <p className="text-sm font-bold" style={{ color: t.textPrimary }}>No trainees found</p>
            <p className="text-xs mt-1">Try resetting the filter or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b" style={{ background: t.surface, borderColor: t.border }}>
                  <th className="p-3 font-bold uppercase tracking-wider w-10 text-center" style={{ color: t.textMuted }}>
                    #
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider min-w-[200px]" style={{ color: t.textMuted }}>
                    Trainee Details
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-24 text-center" style={{ color: t.textMuted }}>
                    Test 1 (/100)
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-28 text-center" style={{ color: t.textMuted }}>
                    Test 2 / OSCE (/100)
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-28 text-center bg-blue-500/5" style={{ color: t.brandBlue }}>
                    CAT ({assessmentScheme.catWeight}%)
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-28 text-center" style={{ color: t.textMuted }}>
                    Final Exam ({assessmentScheme.examWeight}%)
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-28 text-center bg-emerald-500/5" style={{ color: '#10b981' }}>
                    Final (100%)
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-16 text-center" style={{ color: t.textMuted }}>
                    Grade
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-16 text-center" style={{ color: t.textMuted }}>
                    GP (5.0)
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider min-w-[140px]" style={{ color: t.textMuted }}>
                    Academic Standing
                  </th>
                  <th className="p-3 font-bold uppercase tracking-wider w-20 text-center" style={{ color: t.textMuted }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.border }}>
                {filteredRows.map((row, index) => {
                  const isDirty = dirtyRowIds.has(row.student_id);
                  const isSaving = savingRows.has(row.student_id);

                  return (
                    <tr
                      key={row.student_id}
                      className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {/* Row Index */}
                      <td className="p-3 text-center font-bold text-xs" style={{ color: t.textMuted }}>
                        {index + 1}
                      </td>

                      {/* Trainee Details */}
                      <td className="p-3">
                        <div className="font-bold text-xs" style={{ color: t.textPrimary }}>
                          {row.name}
                        </div>
                        <div className="font-mono text-[11px] font-semibold mt-0.5" style={{ color: t.textMuted }}>
                          {row.admission_number || 'No Reg No'}
                        </div>
                      </td>

                      {/* Test 1 / Coursework */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={row.test1 ?? ''}
                          onChange={(e) => handleScoreChange(row.student_id, 'test1', e.target.value)}
                          placeholder="–"
                          className="w-16 text-center py-1.5 px-1 rounded-lg border font-mono font-bold text-xs outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                          style={{
                            background: t.card,
                            borderColor: t.border,
                            color: t.textPrimary,
                          }}
                        />
                      </td>

                      {/* Test 2 / OSCE / Practical */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={row.test2 ?? ''}
                          onChange={(e) => handleScoreChange(row.student_id, 'test2', e.target.value)}
                          placeholder="–"
                          className="w-16 text-center py-1.5 px-1 rounded-lg border font-mono font-bold text-xs outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                          style={{
                            background: t.card,
                            borderColor: t.border,
                            color: t.textPrimary,
                          }}
                        />
                      </td>

                      {/* Auto-Calculated CAT Score (out of 30) */}
                      <td className="p-3 text-center font-mono font-bold bg-blue-500/5">
                        {row.cat_score !== null ? (
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                row.cat_score < (assessmentScheme.passMark / 100) * assessmentScheme.catWeight
                                  ? 'text-rose-500 bg-rose-500/10'
                                  : 'text-blue-500 bg-blue-500/10'
                              }`}
                            >
                              {row.cat_score.toFixed(1)}
                            </span>
                            {row.cat_score < (assessmentScheme.passMark / 100) * assessmentScheme.catWeight && (
                              <span title="CAT below 50% threshold" className="text-rose-500 cursor-help">
                                !
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: t.textMuted }}>–</span>
                        )}
                      </td>

                      {/* Final Exam (70%) */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={row.exam_score ?? ''}
                          onChange={(e) => handleScoreChange(row.student_id, 'exam_score', e.target.value)}
                          placeholder="–"
                          className="w-16 text-center py-1.5 px-1 rounded-lg border font-mono font-bold text-xs outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
                          style={{
                            background: t.card,
                            borderColor: t.border,
                            color: t.textPrimary,
                          }}
                        />
                      </td>

                      {/* Final Composite Mark (100%) */}
                      <td className="p-3 text-center font-mono font-black text-sm bg-emerald-500/5">
                        {row.final_score !== null ? (
                          <span
                            className={
                              row.is_retake ? 'text-rose-500' : row.final_score >= 80 ? 'text-emerald-500' : 'text-blue-500'
                            }
                          >
                            {row.final_score.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: t.textMuted }}>–</span>
                        )}
                      </td>

                      {/* Letter Grade */}
                      <td className="p-3 text-center">
                        {row.grade !== '-' ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-black text-xs font-mono border ${
                              row.is_retake
                                ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                                : row.grade === 'A'
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : row.grade.startsWith('B')
                                ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                            }`}
                          >
                            {row.grade}
                          </span>
                        ) : (
                          <span style={{ color: t.textMuted }}>–</span>
                        )}
                      </td>

                      {/* Grade Point (5.0 scale) */}
                      <td className="p-3 text-center font-mono font-bold">
                        {row.final_score !== null ? (
                          <span className={row.is_retake ? 'text-rose-500' : ''}>
                            {row.grade_point.toFixed(1)}
                          </span>
                        ) : (
                          <span style={{ color: t.textMuted }}>–</span>
                        )}
                      </td>

                      {/* Academic Standing */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                            row.is_retake
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : row.grade === 'A'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : row.grade.startsWith('B')
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}
                        >
                          {row.remarks}
                        </span>
                      </td>

                      {/* Status indicator */}
                      <td className="p-3 text-center">
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-blue-500" />
                        ) : isDirty ? (
                          <span
                            title="Unsaved changes - will auto-save shortly"
                            className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"
                          />
                        ) : row.result_id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-emerald-500" />
                        ) : (
                          <span className="text-[10px] text-muted opacity-50">Empty</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assessment Weights & Scheme Customization Modal */}
      <AnimatePresence>
        {isSchemeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative"
              style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-bold">Configure Continuous Assessment Model</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSchemeModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs font-medium mb-4" style={{ color: t.textMuted }}>
                Adjust statutory coursework, practical examination weights, and the minimum qualifying pass mark. Total weights must equal 100%.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Continuous Assessment (CAT / Coursework) Weight</span>
                    <span className="text-blue-500">{schemeDraft.catWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={5}
                    value={schemeDraft.catWeight}
                    onChange={(e) => {
                      const cat = Number(e.target.value);
                      setSchemeDraft((prev) => ({
                        ...prev,
                        catWeight: cat,
                        examWeight: 100 - cat,
                      }));
                    }}
                    className="w-full accent-blue-500"
                  />
                  <span className="text-[11px] block mt-0.5" style={{ color: t.textMuted }}>
                    Default UNMEB standard is 30% (Test 1 + Practical/OSCE).
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Final Semester Examination Weight</span>
                    <span className="text-emerald-500">{schemeDraft.examWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={90}
                    step={5}
                    value={schemeDraft.examWeight}
                    onChange={(e) => {
                      const exam = Number(e.target.value);
                      setSchemeDraft((prev) => ({
                        ...prev,
                        examWeight: exam,
                        catWeight: 100 - exam,
                      }));
                    }}
                    className="w-full accent-emerald-500"
                  />
                  <span className="text-[11px] block mt-0.5" style={{ color: t.textMuted }}>
                    Default UNMEB standard is 70% (Theory Papers + Clinical Ward).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Minimum Pass Mark Threshold (%)
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={60}
                    step={1}
                    value={schemeDraft.passMark}
                    onChange={(e) =>
                      setSchemeDraft((prev) => ({ ...prev, passMark: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border outline-none shadow-sm"
                    style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
                  />
                  <span className="text-[11px] block mt-0.5" style={{ color: t.textMuted }}>
                    National UNMEB regulation enforces a strict 50.0% pass mark.
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex justify-end gap-2" style={{ borderColor: t.border }}>
                <button
                  type="button"
                  onClick={() => setSchemeDraft(DEFAULT_TERTIARY_SCHEME)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border active:scale-95"
                  style={{ background: t.surface, borderColor: t.border }}
                >
                  Reset to UNMEB Defaults
                </button>
                <button
                  type="button"
                  onClick={() => saveSchemeMutation.mutate(schemeDraft)}
                  disabled={saveSchemeMutation.isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 flex items-center gap-1.5"
                  style={{ background: t.brandBlue }}
                >
                  {saveSchemeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Assessment Scheme</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
