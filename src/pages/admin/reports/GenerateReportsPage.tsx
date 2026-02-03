/**
 * Student Report Generator: Report Type, Term, Class, Student, Preview Report.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { createSnapshotFromExamSet } from '../../../services/snapshotLock';
import { generateReportsBulkClient } from '../../../services/reportGenerator';
import { PRIMARY_TEMPLATES, getTemplateForClass } from '../../../templates/primary';
import { getCurrentTerm } from '../../../lib/termStructure';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { ReportPreviewFromData } from '../../../components/reports/ReportPreviewFromData';
import { Eye, Download, FileDown, Printer } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchGeneratedReports(snapshotId: string) {
  const { data, error } = await supabase
    .from('generated_reports')
    .select('id, snapshot_id, student_id, report_data, generated_at, pdf_url')
    .eq('snapshot_id', snapshotId)
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

type TermOption = { term: number; year: number };

type PageData = {
  schoolId: string;
  currentTerm: TermOption;
  allTerms: TermOption[];
  classes: string[];
  examSets: any[];
};

async function fetchPageData(userId: string): Promise<PageData | null> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return null;

  const { data: terms } = await supabase
    .from('school_terms')
    .select('term, year, start_date, end_date')
    .eq('school_id', u.school_id)
    .order('year', { ascending: false })
    .order('term', { ascending: false });
  const todayStr = new Date().toISOString().slice(0, 10);
  const current =
    (terms || []).find(
      (t: { start_date?: string; end_date: string }) =>
        t.start_date && t.end_date && t.start_date <= todayStr && t.end_date >= todayStr
    ) || (terms?.[0] as { term: number; year: number });
  const fallback = getCurrentTerm();
  const currentTerm = current ? { term: current.term, year: current.year } : { term: fallback.term, year: fallback.year };

  const { data: classRows } = await supabase
    .from('classes')
    .select('class_name')
    .eq('school_id', u.school_id)
    .order('class_name');
  let classList: string[] = (classRows || []).map((r: { class_name: string }) => r.class_name);
  if (classList.length === 0) {
    const { data: students } = await supabase.from('students').select('current_class').eq('school_id', u.school_id);
    const set = new Set<string>();
    (students || []).forEach((s: { current_class?: string }) => s.current_class && set.add(s.current_class));
    classList = Array.from(set).sort();
  }

  const { data: sets } = await supabase
    .from('exam_sets')
    .select('id, name, term, year')
    .eq('school_id', u.school_id)
    .eq('is_active', true)
    .order('year', { ascending: false })
    .order('term', { ascending: false });

  const termSet = new Map<string, TermOption>();
  (terms || []).forEach((t: { term: number; year: number }) => {
    const key = `${t.term}-${t.year}`;
    if (!termSet.has(key)) termSet.set(key, { term: t.term, year: t.year });
  });
  (sets || []).forEach((es: { term: number; year: number }) => {
    const key = `${es.term}-${es.year}`;
    if (!termSet.has(key)) termSet.set(key, { term: es.term, year: es.year });
  });
  let allTerms = Array.from(termSet.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.term - a.term;
  });
  if (allTerms.length === 0) allTerms = [currentTerm];

  return {
    schoolId: u.school_id,
    currentTerm,
    allTerms,
    classes: classList,
    examSets: sets || [],
  };
}

async function fetchStudentsInClass(schoolId: string, className: string) {
  const { data } = await supabase
    .from('students')
    .select('student_id, name, admission_number, current_class')
    .eq('school_id', schoolId)
    .eq('current_class', className)
    .eq('status', 'active')
    .order('name');
  return (data || []) as { student_id: string; name: string; admission_number?: string; current_class: string }[];
}

/** Classes that have at least one exam result for this exam set (so graduated classes like P7 still appear for past terms). */
async function fetchClassesForExamSet(schoolId: string, examSetId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('exam_results')
    .select('class_name')
    .eq('school_id', schoolId)
    .eq('exam_set_id', examSetId);
  if (error) return [];
  const set = new Set((data || []).map((r: { class_name: string }) => r.class_name).filter(Boolean));
  return Array.from(set).sort();
}

/** Students who have exam results in this exam set for this class (includes graduated students for past terms). */
async function fetchStudentsWithResultsInClass(
  schoolId: string,
  examSetId: string,
  className: string
): Promise<{ student_id: string; name: string; admission_number?: string; current_class: string }[]> {
  const { data: resultRows } = await supabase
    .from('exam_results')
    .select('student_id, students!inner(name, admission_number, current_class)')
    .eq('school_id', schoolId)
    .eq('exam_set_id', examSetId)
    .eq('class_name', className);
  const byId = new Map<string, { student_id: string; name: string; admission_number?: string; current_class: string }>();
  (resultRows || []).forEach((r: any) => {
    const sid = r.student_id;
    if (sid && !byId.has(sid))
      byId.set(sid, {
        student_id: sid,
        name: r.students?.name ?? '',
        admission_number: r.students?.admission_number,
        current_class: r.students?.current_class ?? className,
      });
  });
  return Array.from(byId.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export default function GenerateReportsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [reportType, setReportType] = useState<'single' | 'class'>('single');
  const [selectedTermKey, setSelectedTermKey] = useState('');
  const [selectedExamSetId, setSelectedExamSetId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [generatingStep, setGeneratingStep] = useState<'idle' | 'creating' | 'generating' | 'completed' | 'error'>('idle');
  const [completedSnapshotId, setCompletedSnapshotId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState('');
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['admin', 'student-report-generator', user?.id ?? ''],
    queryFn: () => fetchPageData(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const selectedTerm = useMemo((): TermOption | null => {
    if (!pageData) return null;
    if (selectedTermKey) {
      const [t, y] = selectedTermKey.split('-').map(Number);
      if (!isNaN(t) && !isNaN(y)) return { term: t, year: y };
    }
    return pageData.currentTerm;
  }, [pageData, selectedTermKey]);

  const examSetsForSelectedTerm = useMemo(() => {
    if (!pageData) return [];
    const term = selectedTerm || pageData.currentTerm;
    return (pageData.examSets || []).filter(
      (es: any) => es.term === term.term && es.year === term.year
    );
  }, [pageData, selectedTerm]);

  const isMidTermName = (name: string) => /mid|midterm|mid-term/i.test(String(name || '').trim());
  const effectiveExamSetId = useMemo(() => {
    if (!pageData?.examSets?.length || !examSetsForSelectedTerm.length) return null;
    if (selectedExamSetId) return selectedExamSetId;
    const forTerm = examSetsForSelectedTerm;
    if (forTerm.length === 1) return forTerm[0].id;
    const sorted = [...forTerm].sort((a, b) => {
      const aMid = isMidTermName(a.name);
      const bMid = isMidTermName(b.name);
      return aMid === bMid ? 0 : aMid ? 1 : -1;
    });
    return sorted[0]?.id ?? null;
  }, [pageData?.examSets, examSetsForSelectedTerm, selectedExamSetId]);

  const { data: studentsInClass = [] } = useQuery({
    queryKey: ['admin', 'students-in-class', pageData?.schoolId ?? '', selectedClass, effectiveExamSetId ?? ''],
    queryFn: () =>
      effectiveExamSetId
        ? fetchStudentsWithResultsInClass(pageData!.schoolId, effectiveExamSetId, selectedClass)
        : fetchStudentsInClass(pageData!.schoolId, selectedClass),
    enabled: !!pageData?.schoolId && !!selectedClass,
    staleTime: STALE_TIME_MS,
  });

  const { data: generatedReports = [], isLoading: reportsLoading, isError: reportsError } = useQuery({
    queryKey: ['admin', 'generated-reports', completedSnapshotId ?? ''],
    queryFn: () => fetchGeneratedReports(completedSnapshotId!),
    enabled: !!completedSnapshotId,
    staleTime: STALE_TIME_MS,
  });

  const templateDisplayName = useMemo(() => {
    if (!selectedClass) return 'Report For Baby Class';
    const key = getTemplateForClass(selectedClass);
    const t = PRIMARY_TEMPLATES[key as keyof typeof PRIMARY_TEMPLATES];
    return t?.name ?? 'Report For Baby Class';
  }, [selectedClass]);

  const { data: classesForExamSet = [] } = useQuery({
    queryKey: ['admin', 'classes-for-exam-set', pageData?.schoolId ?? '', effectiveExamSetId ?? ''],
    queryFn: () => fetchClassesForExamSet(pageData!.schoolId, effectiveExamSetId!),
    enabled: !!pageData?.schoolId && !!effectiveExamSetId,
    staleTime: STALE_TIME_MS,
  });

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsInClass;
    const q = studentSearch.toLowerCase();
    return studentsInClass.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.admission_number || '').toLowerCase().includes(q)
    );
  }, [studentsInClass, studentSearch]);

  const handlePreviewReport = async () => {
    if (!pageData?.schoolId) return;
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }
    const term = selectedTerm || pageData.currentTerm;
    let examSet: any | undefined;

    if (selectedExamSetId) {
      examSet = pageData.examSets.find((es: any) => es.id === selectedExamSetId);
    } else {
      // Auto (primary): one set → use it; both Mid + End of Term → prefer End of Term so report shows both columns
      const forTerm = (pageData.examSets || []).filter(
        (es: any) => es.term === term.term && es.year === term.year
      );
      const isMidTerm = (name: string) => /mid|midterm|mid-term/i.test(String(name || '').trim());
      if (forTerm.length === 0) {
        // No exam set for this term — do not use another term's data; show error below
        examSet = undefined;
      } else if (forTerm.length === 1) {
        examSet = forTerm[0];
      } else {
        // Multiple sets: put non–Mid Term first, then take first (so we always pick End of Term when both exist)
        const sorted = [...forTerm].sort((a, b) => {
          const aMid = isMidTerm(a.name || '');
          const bMid = isMidTerm(b.name || '');
          if (aMid === bMid) return 0;
          return aMid ? 1 : -1; // non-Mid (End of Term) first
        });
        examSet = sorted[0];
      }
    }

    if (!examSet) {
      setError('');
      setShowNoResultsModal(true);
      return;
    }
    if (reportType === 'single' && !selectedStudent) {
      setError('Please select a student');
      return;
    }
    setPreviewing(true);
    setError('');
    setGenerationError('');
    setCompletedSnapshotId(null);
    setGeneratingStep('creating');
    try {
      // Single student or entire class: only snapshot that subset — much faster (1–2 s instead of 20–30 s)
      const snapshotFilter =
        reportType === 'single' && selectedStudent
          ? { studentIds: [selectedStudent] }
          : reportType === 'class' && selectedClass
            ? { classNames: [selectedClass] }
            : undefined;
      const snapshotId = await createSnapshotFromExamSet(
        pageData.schoolId,
        examSet.id,
        examSet.term,
        examSet.year,
        snapshotFilter
      );
      setGeneratingStep('generating');
      // Client-side bulk generation: entire class = only selected class; single = only selected student
      const result = await generateReportsBulkClient(
        snapshotId,
        undefined,
        reportType === 'class' && selectedClass ? [selectedClass] : undefined,
        reportType === 'single' && selectedStudent ? [selectedStudent] : undefined
      );
      if (!result.success) throw new Error(result.error || 'Generation failed');
      setCompletedSnapshotId(snapshotId);
      setGeneratingStep('completed');
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to generate reports');
      setGeneratingStep('error');
    } finally {
      setPreviewing(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadAsPdf = () => {
    window.print();
  };

  const hasReportsReady = generatingStep === 'completed' && !reportsLoading && !reportsError && generatedReports.length > 0;

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header – exact from screenshot */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">Student Report Generator</h1>
            <p className="text-white/80 text-sm mt-1">Generate and download student academic reports.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Customize Header
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/reports')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Reports
            </button>
          </div>
        </div>

        {/* Report Configuration card – exact from screenshot */}
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6">
          <h2 className="text-white text-lg font-medium mb-4">Report Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Report Template – auto-selected, read-only display */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Report Template
                <span className="ml-2 text-xs text-emerald-400 font-normal">✓ Auto-selected</span>
              </label>
              <div className="relative flex items-center rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-white/90">
                <span>{templateDisplayName}</span>
                <span className="ml-2 text-emerald-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
              <p className="mt-1 text-xs text-white/50">
                Template automatically selected based on class section to ensure consistent formatting.
              </p>
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value as 'single' | 'class');
                  setSelectedStudent('');
                }}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="single" className="text-black">Single Student</option>
                <option value="class" className="text-black">Entire Class</option>
              </select>
            </div>

            {/* Term – choose any term (defaults to current) */}
            {pageData && pageData.allTerms.length > 0 && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Term</label>
                <select
                  value={selectedTermKey || `${pageData.currentTerm.term}-${pageData.currentTerm.year}`}
                  onChange={(e) => {
                    setSelectedTermKey(e.target.value);
                    setSelectedExamSetId('');
                    setSelectedClass('');
                    setSelectedStudent('');
                  }}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {pageData.allTerms.map((t) => {
                    const key = `${t.term}-${t.year}`;
                    const isCurrent =
                      t.term === pageData.currentTerm.term && t.year === pageData.currentTerm.year;
                    return (
                      <option key={key} value={key} className="text-black">
                        Term {t.term}, {t.year}{isCurrent ? ' (Current)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-xs text-white/50">
                  Choose the term for which to generate reports.
                </p>
              </div>
            )}

            {/* Exam Set – choose specific exam set within the selected term */}
            {pageData && examSetsForSelectedTerm.length > 0 && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Exam Set</label>
                <select
                  value={selectedExamSetId}
                  onChange={(e) => {
                    setSelectedExamSetId(e.target.value);
                    setSelectedClass('');
                    setSelectedStudent('');
                  }}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" className="text-black">
                    Auto (latest exam set for selected term)
                  </option>
                  {examSetsForSelectedTerm.map((es: any) => (
                    <option key={es.id} value={es.id} className="text-black">
                      {es.name || `Set - Term ${es.term}, ${es.year}`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-white/50">
                  Pick Mid Term or End of Term exam set. Leave on Auto to use the latest set (usually End of Term).
                </p>
              </div>
            )}
            {pageData && examSetsForSelectedTerm.length === 0 && selectedTerm && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                No exam set for Term {(selectedTerm || pageData.currentTerm).term}, {(selectedTerm || pageData.currentTerm).year}. Create a Mid Term or End of Term exam set for this term to generate reports.
              </div>
            )}

            {/* Class – only classes that have results for the selected exam set (so past terms show e.g. P7) */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Class</label>
              {effectiveExamSetId ? (
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedStudent('');
                    setStudentSearch('');
                  }}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" className="text-white/70">Select Class</option>
                  {classesForExamSet.map((c) => (
                    <option key={c} value={c} className="text-black">{c}</option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-white/70 text-sm">
                  Select Term and Exam Set first — then classes with results for that set will appear.
                </div>
              )}
              {effectiveExamSetId && classesForExamSet.length === 0 && (
                <p className="mt-1 text-xs text-amber-300">No results for this exam set yet.</p>
              )}
            </div>
          </div>

          {/* Student – only when Single Student */}
          {reportType === 'single' && (
            <div className="mb-6">
              <label className="block text-white/80 text-sm font-medium mb-2">Student</label>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or admission number"
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              />
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="" className="text-white/70">Select Student</option>
                {filteredStudents.map((s) => (
                  <option key={s.student_id} value={s.student_id} className="text-black">
                    {s.name} {s.admission_number ? `(${s.admission_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {generatingStep === 'error' && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <p className="font-medium">{generationError}</p>
              <p className="mt-1 text-xs text-red-200/90">
                If it keeps failing: Vercel → Settings → Environment Variables (SUPABASE_URL, SUPABASE_ANON_KEY); redeploy; or check Vercel → Deployments → Functions → Logs.
              </p>
              <button
                type="button"
                onClick={() => { setGeneratingStep('idle'); setGenerationError(''); void handlePreviewReport(); }}
                className="mt-2 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={handlePreviewReport}
              disabled={previewing || !selectedClass || (reportType === 'single' && !selectedStudent)}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {previewing ? (generatingStep === 'creating' ? 'Preparing…' : 'Generating…') : 'Preview Report'}
            </button>
            <button
              type="button"
              onClick={handleDownloadAsPdf}
              disabled={!hasReportsReady}
              title={hasReportsReady ? 'Open print dialog — choose "Save as PDF" to download PDF' : 'Generate reports first'}
              className="px-5 py-3 rounded-lg bg-red-600/90 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              {reportType === 'single' ? 'Download as PDF (Single)' : 'Download All as PDF (Class)'}
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={!hasReportsReady}
              title={hasReportsReady ? 'Print report(s)' : 'Generate reports first'}
              className="px-5 py-3 rounded-lg bg-amber-600/90 text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Report
            </button>
          </div>

          {/* Report Preview – single student = one card, entire class = all cards (old 2f00b44 style) */}
          {generatingStep === 'completed' && completedSnapshotId && !reportsLoading && !reportsError && generatedReports.length > 0 && (() => {
            const reportsToShow = reportType === 'single' && selectedStudent
              ? generatedReports.filter((r: any) => r.student_id === selectedStudent)
              : generatedReports;
            if (reportsToShow.length === 0) return null;
            return (
              <div id="report-preview-print-area" className="report-preview-print mt-8 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white text-lg font-semibold">Report Preview</h2>
                  <span className="text-white/70 text-sm">Template: {templateDisplayName}</span>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg overflow-auto max-h-[80vh]">
                  <div className="bg-white dark:bg-transparent mx-auto space-y-8" style={{ width: '210mm', maxWidth: '100%' }}>
                    {reportsToShow.map((report: any) => (
                      <ReportPreviewFromData key={report.id} reportData={report.report_data} />
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-white/70 text-sm text-center">
                  This preview shows exactly how the report{reportsToShow.length > 1 ? 's' : ''} will look when downloaded or printed.
                </p>
              </div>
            );
          })()}

          {/* No results for selected term – pop-up with OK */}
          <GlassModal
            isOpen={showNoResultsModal}
            onClose={() => setShowNoResultsModal(false)}
            title="No results found"
            size="md"
          >
            <p className="text-white/90 mb-4">
              No results found for the selected term. There is no Mid Term, End of Term, or Beginning of Term exam set for Term {(selectedTerm || pageData?.currentTerm)?.term}, {(selectedTerm || pageData?.currentTerm)?.year}. Create an exam set for this term to generate reports.
            </p>
            <button
              type="button"
              onClick={() => setShowNoResultsModal(false)}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3"
            >
              OK
            </button>
          </GlassModal>

          {/* Report preview modal (same as ReportViewer) */}
          {viewingReport && (
            <GlassModal
              isOpen={!!viewingReport}
              onClose={() => setViewingReport(null)}
              title={`Report: ${viewingReport.students?.name || 'Student'}`}
              size="xl"
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <h3 className="font-semibold text-white mb-2">Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-white/85">
                    <div><span className="text-white/70">Average:</span> {viewingReport.reportData?.students?.[0]?.summary?.average?.toFixed(2) ?? '—'}%</div>
                    <div><span className="text-white/70">Position:</span> {viewingReport.reportData?.students?.[0]?.summary?.classPosition ?? '—'}</div>
                    <div><span className="text-white/70">Division:</span> {viewingReport.reportData?.students?.[0]?.summary?.division ?? '—'}</div>
                    <div><span className="text-white/70">Aggregate:</span> {viewingReport.reportData?.students?.[0]?.summary?.aggregate?.toFixed(2) ?? '—'}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <h3 className="font-semibold text-white mb-2">Subjects</h3>
                  <div className="space-y-2">
                    {viewingReport.reportData?.students?.[0]?.results?.map((result: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm text-white/85">
                        <span>{result.subject}</span>
                        <span className="font-semibold text-white">{result.marks_obtained} / {result.total_marks} ({result.grade})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingReport(null)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/20"
                >
                  Close
                </button>
              </div>
            </GlassModal>
          )}
        </div>
      </div>
    </div>
  );
}
