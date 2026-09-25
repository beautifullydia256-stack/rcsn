import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Download,
  Printer,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { useToast } from '@/components/Toast';
import { useTeacherContext } from '../useTeacherContext';
import {
  TertiaryGradeBand,
  TraineeAssessmentRow,
  DEFAULT_TERTIARY_GRADE_BANDS,
  fetchTertiaryGradingBands,
  computeTertiaryMark,
  fetchCohortAssessmentData,
  saveTraineeAssessment,
  saveBatchTraineeAssessments,
} from '@/features/tertiary/services/tertiaryAssessmentService';

type ExamSetOption = {
  id: string;
  name: string;
  term?: number;
  year?: number;
};

export default function TertiaryContinuousAssessmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { classEncoded, subjectEncoded } = useParams<{ classEncoded?: string; subjectEncoded?: string }>();

  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const schoolId = useAuthStore((s) => s.schoolId);
  const { teacherId } = useTeacherContext();

  const selectedClass = classEncoded ? decodeURIComponent(classEncoded) : '';
  const initialSubject = subjectEncoded ? decodeURIComponent(subjectEncoded) : '';

  const [currentSubject, setCurrentSubject] = useState(initialSubject);
  const [selectedExamSetId, setSelectedExamSetId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'distinction' | 'credit' | 'pass' | 'retake'>('all');

  // Local grid rows state for ultra-responsive typing without UI stutter
  const [rows, setRows] = useState<TraineeAssessmentRow[]>([]);
  const rowsRef = useRef<TraineeAssessmentRow[]>(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(new Set());
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Per-student auto-save timers map (prevents rapid typing from cancelling saves of other students)
  const studentTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 1. Fetch Exam Sets for this institution
  const { data: examSets = [], isLoading: examSetsLoading } = useQuery({
    queryKey: ['tertiary', 'exam-sets', schoolId ?? ''],
    queryFn: async (): Promise<ExamSetOption[]> => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('exam_sets')
        .select('id, name, term, year')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        term: d.term,
        year: d.year,
      }));
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!schoolId,
  });

  // Automatically select the active/latest exam set
  useEffect(() => {
    if (!selectedExamSetId && examSets.length > 0) {
      setSelectedExamSetId(examSets[0].id);
    }
  }, [examSets, selectedExamSetId]);

  // 2. Fetch Grading Bands
  const { data: gradingBands = DEFAULT_TERTIARY_GRADE_BANDS, isLoading: bandsLoading } = useQuery({
    queryKey: ['tertiary', 'grading-bands', schoolId ?? ''],
    queryFn: () => fetchTertiaryGradingBands(schoolId!),
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!schoolId,
  });

  // 3. Fetch Assigned Course Units for this Cohort
  const { data: cohortSubjects = [] } = useQuery({
    queryKey: ['tertiary', 'cohort-subjects', schoolId ?? '', selectedClass],
    queryFn: async () => {
      if (!schoolId || !selectedClass) return [];
      const { data } = await supabase
        .from('teacher_class_subjects')
        .select('subject')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass);
      const unique = Array.from(new Set((data || []).map((r: { subject: string }) => r.subject))).sort();
      return unique;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!schoolId && !!selectedClass,
  });

  // Set default subject if not provided or if current subject is not in list
  useEffect(() => {
    if (!currentSubject && cohortSubjects.length > 0) {
      setCurrentSubject(cohortSubjects[0]);
    }
  }, [cohortSubjects, currentSubject]);

  // 4. Fetch Trainees and their Results for selected Cohort, Course Unit & Exam Set
  const {
    data: serverRows = [],
    isLoading: rowsLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'tertiary',
      'cohort-assessment-rows',
      schoolId ?? '',
      selectedClass,
      currentSubject,
      selectedExamSetId,
    ],
    queryFn: () =>
      fetchCohortAssessmentData(
        schoolId!,
        selectedClass,
        currentSubject,
        gradingBands,
        selectedExamSetId || undefined
      ),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!schoolId && !!selectedClass && !!currentSubject,
  });

  // Sync server rows to local editable state when loaded or refreshed
  useEffect(() => {
    if (serverRows.length > 0 && dirtyRowIds.size === 0) {
      setRows(serverRows);
    }
  }, [serverRows]);

  // Single Mark Input Change Handler
  const handleScoreChange = useCallback(
    (studentId: string, rawValue: string) => {
      const parsed = rawValue.trim() === '' ? null : Math.max(0, Math.min(100, Number(rawValue)));

      setRows((prev) => {
        const next = prev.map((row) => {
          if (row.student_id !== studentId) return row;

          const computed = computeTertiaryMark(parsed, gradingBands);

          return {
            ...row,
            marks_obtained: parsed,
            final_score: parsed,
            exam_score: parsed,
            grade: computed.grade,
            grade_point: computed.grade_point,
            status: computed.status,
            is_retake: computed.is_retake,
            remarks: computed.remarks,
          };
        });
        rowsRef.current = next;
        return next;
      });

      setDirtyRowIds((prev) => new Set(prev).add(studentId));

      // Clear existing debounce timer for this specific student
      const existingTimer = studentTimersRef.current.get(studentId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set debounced timer for this student without cancelling other students
      const timer = setTimeout(() => {
        studentTimersRef.current.delete(studentId);
        void saveStudentScore(studentId);
      }, 750);
      studentTimersRef.current.set(studentId, timer);
    },
    [gradingBands]
  );

  // Single Student Save Function
  const saveStudentScore = async (studentId: string) => {
    const targetRow = rowsRef.current.find((r) => r.student_id === studentId);
    if (!targetRow || !schoolId || !selectedClass || !currentSubject) return;

    setSavingRows((prev) => new Set(prev).add(studentId));
    try {
      const resultId = await saveTraineeAssessment(
        schoolId,
        teacherId,
        selectedClass,
        currentSubject,
        selectedExamSetId,
        targetRow,
        gradingBands
      );

      // Update local state with the returned result_id
      setRows((prev) => {
        const next = prev.map((r) => (r.student_id === studentId ? { ...r, result_id: resultId } : r));
        rowsRef.current = next;
        return next;
      });

      // Optimistically update React Query cache so reopening page is 100% instant
      queryClient.setQueryData(
        [
          'tertiary',
          'cohort-assessment-rows',
          schoolId,
          selectedClass,
          currentSubject,
          selectedExamSetId,
        ],
        (old: TraineeAssessmentRow[] | undefined) => {
          if (!old) return old;
          return old.map((r) =>
            r.student_id === studentId
              ? { ...r, ...targetRow, result_id: resultId }
              : r
          );
        }
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

  // Bulk Save All Entered and Dirty Rows
  const saveAllResults = async () => {
    if (isBulkSaving) return;

    // Clear all pending per-student timers
    studentTimersRef.current.forEach((t) => clearTimeout(t));
    studentTimersRef.current.clear();

    // Target all rows with entered marks or dirty flags
    const rowsToSave = rowsRef.current.filter(
      (r) => dirtyRowIds.has(r.student_id) || (r.marks_obtained !== null && r.marks_obtained !== undefined)
    );

    if (rowsToSave.length === 0) {
      toast.info('No entered marks to save. Please type student scores first.');
      return;
    }

    setIsBulkSaving(true);
    try {
      const resultMap = await saveBatchTraineeAssessments(
        schoolId!,
        teacherId,
        selectedClass,
        currentSubject,
        selectedExamSetId,
        rowsToSave,
        gradingBands
      );

      const savedCount = resultMap.size;

      setRows((prev) => {
        const next = prev.map((r) => {
          const newId = resultMap.get(r.student_id);
          return newId ? { ...r, result_id: newId } : r;
        });
        rowsRef.current = next;
        return next;
      });

      // Optimistically sync query cache
      queryClient.setQueryData(
        [
          'tertiary',
          'cohort-assessment-rows',
          schoolId,
          selectedClass,
          currentSubject,
          selectedExamSetId,
        ],
        (old: TraineeAssessmentRow[] | undefined) => {
          if (!old) return old;
          return old.map((r) => {
            const updated = rowsRef.current.find((x) => x.student_id === r.student_id);
            return updated ? { ...updated, result_id: resultMap.get(r.student_id) || updated.result_id } : r;
          });
        }
      );

      setDirtyRowIds(new Set());
      setLastSavedAt(new Date());

      if (savedCount > 0) {
        toast.success(`Successfully saved marks for ${savedCount} trainee${savedCount > 1 ? 's' : ''}!`);
      } else {
        toast.warning('No records were updated. Please check connection and try again.');
      }
    } catch (err: any) {
      console.error('Failed to bulk save assessments:', err);
      toast.error(`Save failed: ${err?.message || 'Database error'}`);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Export UNMEB / UHPAB Mark Entry CSV
  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const headers = [
      'No',
      'Admission No',
      'Trainee Name',
      'Cohort',
      'Course Unit',
      'Mark (/100)',
      'Grade',
      'Grade Point (GP)',
      'Status',
    ];

    const csvRows = rows.map((r, idx) => [
      idx + 1,
      `"${r.admission_number}"`,
      `"${r.name}"`,
      `"${selectedClass}"`,
      `"${currentSubject}"`,
      r.marks_obtained ?? '',
      r.grade,
      r.grade_point > 0 ? r.grade_point.toFixed(1) : '0.0',
      `"${r.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Assessment_${selectedClass.replace(/[^a-zA-Z0-9]/g, '_')}_${currentSubject.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Rows based on Search and Status Filter
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
      if (statusFilter === 'retake') return r.is_retake || r.status === 'RETAKE';
      return true;
    });
  }, [rows, searchQuery, statusFilter]);

  // Live Performance KPI Computations
  const totalEnrolled = rows.length;
  const capturedCount = rows.filter((r) => r.marks_obtained !== null).length;
  const capturePct = totalEnrolled > 0 ? Math.round((capturedCount / totalEnrolled) * 100) : 0;

  const validMarks = rows.map((r) => r.marks_obtained).filter((s): s is number => s !== null);
  const classAverage =
    validMarks.length > 0
      ? Math.round((validMarks.reduce((a, b) => a + b, 0) / validMarks.length) * 10) / 10
      : 0;

  const passCount = rows.filter((r) => r.marks_obtained !== null && !r.is_retake).length;
  const retakeCount = rows.filter((r) => r.marks_obtained !== null && r.is_retake).length;
  const passRate = capturedCount > 0 ? Math.round((passCount / capturedCount) * 100) : 0;

  const distinctionCount = rows.filter((r) => r.grade === 'A').length;
  const creditCount = rows.filter((r) => r.grade === 'B+' || r.grade === 'B').length;
  const passGradeCount = rows.filter((r) => ['C+', 'C', 'D+', 'D'].includes(r.grade)).length;

  const isLoading = bandsLoading || rowsLoading || examSetsLoading;

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
                  Continuous Assessment & Mark Entry
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
                {selectedClass || 'Continuous Assessment'}
              </h1>
              <p className="text-xs font-semibold mt-0.5" style={{ color: t.textMuted }}>
                Input results out of 100. The system automatically computes Grade, Grade Point (GP), and Pass/Retake status.
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={saveAllResults}
              disabled={isBulkSaving || rows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
              style={{ background: dirtyRowIds.size > 0 ? t.brandBlue : '#10b981' }}
              title="Save all entered results to database"
            >
              {isBulkSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : dirtyRowIds.size === 0 && lastSavedAt ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {isBulkSaving
                  ? 'Saving Marks...'
                  : dirtyRowIds.size > 0
                  ? `Save All (${dirtyRowIds.size} pending)`
                  : 'Save All Results'}
              </span>
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
              <span>Print</span>
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

        {/* Exam Set & Course Unit Selectors Bar */}
        <div
          className="mt-5 pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ borderColor: t.border }}
        >
          <div className="flex flex-wrap items-center gap-4">
            {/* Exam Set Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-1" style={{ color: t.textMuted }}>
                <Layers className="w-3.5 h-3.5" />
                Exam Set:
              </span>
              <select
                value={selectedExamSetId}
                onChange={(e) => setSelectedExamSetId(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 shadow-sm"
                style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
              >
                {examSets.map((es) => (
                  <option key={es.id} value={es.id}>
                    {es.name} {es.year ? `(${es.year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Unit Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider shrink-0 flex items-center gap-1" style={{ color: t.textMuted }}>
                <BookOpen className="w-3.5 h-3.5" />
                Course Unit:
              </span>
              {cohortSubjects.length > 0 ? (
                <select
                  value={currentSubject}
                  onChange={(e) => setCurrentSubject(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 shadow-sm"
                  style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
                >
                  {cohortSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold italic" style={{ color: t.textMuted }}>
                  {currentSubject || 'No assigned subjects'}
                </span>
              )}
            </div>
          </div>

          {/* Real-time Save Status */}
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: t.textMuted }}>
            {savingRows.size > 0 ? (
              <span className="flex items-center gap-1 text-blue-500 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving marks...
              </span>
            ) : dirtyRowIds.size > 0 ? (
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Clock className="w-3.5 h-3.5" />
                {dirtyRowIds.size} unsaved change{dirtyRowIds.size > 1 ? 's' : ''}
              </span>
            ) : lastSavedAt ? (
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All changes saved ({lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                Instant autosave enabled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Live Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trainees */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Trainees Enrolled
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {totalEnrolled}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Active in cohort
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Captured Count */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Marks Captured
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: '#10b981' }}>
              {capturedCount} / {totalEnrolled}
            </div>
            <div className="w-28 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${capturePct}%` }}
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
              Cohort Average
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

      {/* Grade Performance Filter Pills & Search */}
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
            placeholder="Search trainee name or reg number..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          />
        </div>
      </div>

      {/* Trainee Mark Entry Grid */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: t.border }}>
          <div>
            <h2 className="text-sm font-black" style={{ color: t.textPrimary }}>
              Mark Entry Sheet: {currentSubject}
            </h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
              Direct score entry out of 100. Grades and Grade Points (GP) calculated automatically.
            </p>
          </div>
          <div
            className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg border bg-black/5 dark:bg-white/5"
            style={{ borderColor: t.border }}
          >
            {filteredRows.length} Trainees Shown
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3" style={{ color: t.textMuted }}>
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm font-semibold">Loading trainee roster...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center" style={{ color: t.textMuted }}>
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
            <p className="text-sm font-bold" style={{ color: t.textPrimary }}>
              No trainees found
            </p>
            <p className="text-xs mt-1">Try resetting the filter or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b" style={{ background: t.surface, borderColor: t.border }}>
                  <th
                    className="p-3 font-bold uppercase tracking-wider w-12 text-center"
                    style={{ color: t.textMuted }}
                  >
                    #
                  </th>
                  <th
                    className="p-3 font-bold uppercase tracking-wider min-w-[220px]"
                    style={{ color: t.textMuted }}
                  >
                    Trainee Details
                  </th>
                  <th
                    className="p-3 font-bold uppercase tracking-wider w-36 text-center bg-blue-500/5"
                    style={{ color: t.brandBlue }}
                  >
                    Marks (/100)
                  </th>
                  <th
                    className="p-3 font-bold uppercase tracking-wider w-20 text-center"
                    style={{ color: t.textMuted }}
                  >
                    Grade
                  </th>
                  <th
                    className="p-3 font-bold uppercase tracking-wider w-20 text-center"
                    style={{ color: t.textMuted }}
                  >
                    GP (5.0)
                  </th>
                  <th
                    className="p-3 font-bold uppercase tracking-wider w-28 text-center"
                    style={{ color: t.textMuted }}
                  >
                    Status
                  </th>
                  <th
                    className="p-3 font-bold uppercase tracking-wider w-16 text-center"
                    style={{ color: t.textMuted }}
                  >
                    State
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

                      {/* Single Direct Mark Input (/100) */}
                      <td className="p-3 text-center bg-blue-500/5">
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={row.marks_obtained ?? ''}
                            onChange={(e) => handleScoreChange(row.student_id, e.target.value)}
                            onBlur={() => {
                              const pendingTimer = studentTimersRef.current.get(row.student_id);
                              if (pendingTimer) {
                                clearTimeout(pendingTimer);
                                studentTimersRef.current.delete(row.student_id);
                              }
                              if (dirtyRowIds.has(row.student_id)) {
                                void saveStudentScore(row.student_id);
                              }
                            }}
                            placeholder="–"
                            className="w-24 text-center py-1.5 px-2 rounded-xl border font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-inner transition-all"
                            style={{
                              background: t.card,
                              borderColor: isDirty ? '#f59e0b' : t.border,
                              color: t.textPrimary,
                            }}
                          />
                        </div>
                      </td>

                      {/* Auto-Calculated Grade */}
                      <td className="p-3 text-center">
                        <span
                          className={`font-black px-2 py-0.5 rounded-md inline-block ${
                            row.grade === 'A'
                              ? 'text-emerald-500 bg-emerald-500/10'
                              : ['B+', 'B'].includes(row.grade)
                              ? 'text-blue-500 bg-blue-500/10'
                              : ['C+', 'C', 'D+', 'D'].includes(row.grade)
                              ? 'text-amber-500 bg-amber-500/10'
                              : row.grade === 'F'
                              ? 'text-rose-500 bg-rose-500/10'
                              : 'text-gray-400'
                          }`}
                        >
                          {row.grade}
                        </span>
                      </td>

                      {/* Auto-Calculated Grade Point (5.0 Scale) */}
                      <td className="p-3 text-center font-mono font-bold">
                        <span
                          className={
                            row.grade_point >= 4.0
                              ? 'text-emerald-500'
                              : row.grade_point >= 2.0
                              ? 'text-blue-500'
                              : row.grade_point > 0
                              ? 'text-amber-500'
                              : 'text-rose-500'
                          }
                        >
                          {row.marks_obtained !== null ? row.grade_point.toFixed(1) : '–'}
                        </span>
                      </td>

                      {/* Auto-Calculated Status (PASS >= 50 / RETAKE < 50) */}
                      <td className="p-3 text-center">
                        {row.marks_obtained === null ? (
                          <span className="text-gray-400 font-semibold">–</span>
                        ) : row.status === 'PASS' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                            style={{
                              background: 'rgba(16, 185, 129, 0.12)',
                              borderColor: 'rgba(16, 185, 129, 0.25)',
                              color: '#10b981',
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            PASS
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              borderColor: 'rgba(239, 68, 68, 0.25)',
                              color: '#ef4444',
                            }}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            RETAKE
                          </span>
                        )}
                      </td>

                      {/* Row State Status (Saved / Saving / Unsaved) */}
                      <td className="p-3 text-center">
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mx-auto animate-spin text-blue-500" />
                        ) : isDirty ? (
                          <span title="Unsaved changes" className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        ) : row.marks_obtained !== null ? (
                          <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500 opacity-80" />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">–</span>
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
    </div>
  );
}
