/**
 * Secondary-only report generator (O-Level / A-Level).
 * PDF: renders HTML on the client via renderTemplateHTML, then POSTs htmlContent to
 * /api/reports/generate-pdf (same Next.js route as primary — no src/ import issues on Vercel).
 * Primary schools use GenerateReportsPage at /dashboard/admin/reports/generate.
 */
import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { enrichSecondaryOlevelPreviewReportsFromDb } from '../../../lib/enrichSecondaryOlevelPreviewFromDb';
import { enrichSecondaryAlevelPreviewReportsFromDb } from '../../../lib/enrichSecondaryAlevelPreviewFromDb';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { useUIStore } from '../../../store/uiStore';
import { getTokens, SORA, INTER } from '@/styles/posThemeTokens';
import {
  FileText,
  Calendar,
  Layers,
  Users,
  User,
  GraduationCap,
  Sparkles,
  School,
  Eye,
  FileDown,
  Archive,
  FolderArchive,
  UploadCloud,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Printer,
  ChevronRight,
  BookOpen,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { getCurrentTerm } from '../../../lib/termStructure';
import { resolveCurrentSchoolTerm } from '../../../lib/adminFinanceTerm';
import { isDesktopApp } from '../../../lib/isDesktopApp';
import { getFunctionInvokeErrorDetail } from '../../../lib/supabaseFunctionInvokeError';
import { formatSupabaseError, hintForPublishedReportRpc } from '../../../lib/supabaseError';
import { formatAverageWhole } from '../../../lib/reportUtils';
import { isElectronDesktop } from '../../../lib/desktopPdf';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { StudentSelectCombobox } from '../../../components/reports/StudentSelectCombobox';
import { isALevelClass, isOLevelClass } from '../../../components/reports/templates/helpers';
import {
  SECONDARY_TEMPLATES,
  getDefaultSecondaryTemplateKey,
  getSecondaryTemplateKeysForClass,
  type SecondaryTemplateKey,
} from '../../../templates/secondary';
import { SecondaryBuiltInHtmlPreview } from '../../../components/reports/SecondaryBuiltInHtmlPreview';
import {
  buildSecondaryShapedStudent,
  pickSecondaryTemplateRootFields,
} from '../../../reports/secondary/buildSecondaryShapedStudent';
import { ensureClassIdForPublish } from '../../../lib/classIdLookup';
import { buildSingleStudentReportPdfFilename } from '../../../lib/reportPdfFilenames';
import {
  adminReportPdfBlobsFromPreviewSecondary,
  secondaryGeneratePdfFromReports,
} from '../../../lib/adminReportPdfFromPreview';
import {
  buildPublishedClassBundleStoragePath,
  buildPublishedStudentReportStoragePath,
  getStudentIdFromPreviewReportData,
} from '../../../lib/publishedReportPaths';
import { saveBlobAsDownload, storageDownloadBlob } from '../../../lib/downloadBlob';
import JSZip from 'jszip';

function SecondaryReportPreviewBlock({ reportData, templateKey }: { reportData: any; templateKey: string }) {
  const student = buildSecondaryShapedStudent(reportData);
  const school = (reportData.school || {}) as Record<string, unknown>;
  const examSet = (reportData.examSet || {}) as Record<string, unknown>;
  const extraTemplateFields = pickSecondaryTemplateRootFields(reportData as Record<string, unknown>);
  return (
    <div className="report-preview-pdf-fonts-primary">
      <SecondaryBuiltInHtmlPreview
        student={student}
        examSet={examSet}
        school={school}
        templateKey={templateKey}
        extraTemplateFields={extraTemplateFields}
      />
    </div>
  );
}

/** White PDF-style document icon paired with Acrobat-style red (#EC1C24) on the button. */
function AcrobatStylePdfIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M13.88 2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15A2.25 2.25 0 0 0 6.75 21.75h10.5A2.25 2.25 0 0 0 19.5 19.5V9.03l-5.62-5.78Z"
      />
      <path
        fill="currentColor"
        fillOpacity={0.45}
        d="M13.5 2.25V8.25h5.85L13.5 2.25Z"
      />
      <path
        fill="currentColor"
        fillOpacity={0.35}
        d="M7.88 12.38h8.25v1.5H7.88v-1.5Zm0 2.62h8.25v1.5H7.88V15Zm0 2.62h5.62v1.5H7.88v-1.5Z"
      />
    </svg>
  );
}

const STALE_TIME_MS = 5 * 60 * 1000;

/** Stable key for React Query + preview / PDF (must match edge payload). */
export function secondaryReportPreviewQueryKey(
  schoolId: string,
  term: number,
  year: number,
  examSetId: string,
  className: string,
  reportType: 'single' | 'class',
  studentIdForKey: string,
  largeClassPreview = false
) {
  return ['admin', 'report-preview-secondary', schoolId, term, year, examSetId, className, reportType, studentIdForKey, largeClassPreview] as const;
}

type PreviewInvokeBody = {
  schoolId: string;
  term: number;
  year: number;
  examSetId: string;
  className: string;
  studentId?: string;
  largeClassPreview?: boolean;
};

async function invokeReportPreview(payload: PreviewInvokeBody): Promise<any[]> {
  const { data, error: fnError } = await supabase.functions.invoke('generate-report-preview', { body: payload });
  if (fnError) throw new Error(await getFunctionInvokeErrorDetail(fnError));
  const body = data as { reports?: unknown[]; error?: string } | null | undefined;
  if (body && typeof body.error === 'string' && body.error.trim()) {
    throw new Error(body.error.trim());
  }
  const raw = (body?.reports ?? []) as unknown[];
  const afterOlevel = await enrichSecondaryOlevelPreviewReportsFromDb(supabase, payload.schoolId, raw);
  return (await enrichSecondaryAlevelPreviewReportsFromDb(supabase, payload.schoolId, {
    term: payload.term,
    year: payload.year,
    examSetId: payload.examSetId,
    classNames: [payload.className].filter(Boolean),
  }, afterOlevel)) as any[];
}

async function fetchGeneratedReports(snapshotId: string) {
  const { data, error } = await supabase
    .from('generated_reports')
    .select('id, snapshot_id, student_id, report_data, generated_at, pdf_url, template_id')
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

export async function fetchPageData(userId: string): Promise<PageData | null> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return null;

  const { data: terms } = await supabase
    .from('school_terms')
    .select('term, year, start_date, end_date')
    .eq('school_id', u.school_id)
    .order('year', { ascending: false })
    .order('term', { ascending: false });
  const todayStr = new Date().toISOString().slice(0, 10);
  const engine = await resolveCurrentSchoolTerm(supabase, u.school_id, todayStr);
  const fallback = getCurrentTerm();
  const currentTerm =
    engine?.year != null && engine.term != null
      ? { term: engine.term, year: engine.year }
      : { term: fallback.term, year: fallback.year };

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
    .select('id, name, term, year, is_active')
    .eq('school_id', u.school_id)
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
  // Only include terms up to and including the detected current term (no future terms like Term 2/3 of next year).
  let allTerms = Array.from(termSet.values())
    .filter((t) => t.year < currentTerm.year || (t.year === currentTerm.year && t.term <= currentTerm.term))
    .sort((a, b) => {
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

/** Students who have exam results in this exam set for this class (includes graduated). Uses RPC so RLS does not hide graduated students. */
async function fetchStudentsWithResultsInClass(
  schoolId: string,
  examSetId: string,
  className: string
): Promise<{ student_id: string; name: string; admission_number?: string; current_class: string }[]> {
  const { data, error } = await supabase.rpc('get_report_students_for_class', {
    p_school_id: schoolId,
    p_exam_set_id: examSetId,
    p_class_name: className,
  });
  if (error) throw error;
  const rows = (data || []) as { student_id: string; name: string; admission_number?: string; current_class: string }[];
  return rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export default function SecondaryGenerateReportsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const [reportType, setReportType] = useState<'single' | 'class'>('single');
  const [selectedTermKey, setSelectedTermKey] = useState('');
  const [selectedExamSetId, setSelectedExamSetId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [generatingStep, setGeneratingStep] = useState<'idle' | 'creating' | 'generating' | 'completed' | 'error'>('idle');
  const [completedSnapshotId, setCompletedSnapshotId] = useState<string | null>(null);
  const [previewReports, setPreviewReports] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [generationError, setGenerationError] = useState('');
  const [viewingReport, setViewingReport] = useState<any | null>(null);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadPdfStatus, setDownloadPdfStatus] = useState('');
  const [downloadingClassZip, setDownloadingClassZip] = useState(false);
  const [classZipStatus, setClassZipStatus] = useState('');
  const [uploadingOnlineReview, setUploadingOnlineReview] = useState(false);
  const [uploadOnlineStatus, setUploadOnlineStatus] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [downloadingPublished, setDownloadingPublished] = useState(false);
  const [downloadPublishedStatus, setDownloadPublishedStatus] = useState('');
  const [reportTemplateKey, setReportTemplateKey] = useState<string>('template1');
  const prevClassForTemplateRef = useRef<string | null>(null);
  /** Selection used when we last generated; snapshot is only reused when current selection matches */
  const [lastGenerateFingerprint, setLastGenerateFingerprint] = useState<{
    term: number;
    year: number;
    examSetId: string;
    selectedClass: string;
    reportType: 'single' | 'class';
    selectedStudent: string;
  } | null>(null);

  const { data: schoolType, isPending: schoolTypePending } = useSchoolType();

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

  /** Current selection as a fingerprint; used to decide if we can reuse the last snapshot */
  const currentFingerprint = useMemo(() => {
    const term = selectedTerm || pageData?.currentTerm;
    if (!term || !effectiveExamSetId || !selectedClass) return null;
    return {
      term: term.term,
      year: term.year,
      examSetId: effectiveExamSetId,
      selectedClass,
      reportType,
      selectedStudent: reportType === 'single' ? selectedStudent : '',
    };
  }, [selectedTerm, pageData?.currentTerm, effectiveExamSetId, selectedClass, reportType, selectedStudent]);

  const snapshotMatchesCurrentSelection =
    !!lastGenerateFingerprint &&
    !!currentFingerprint &&
    lastGenerateFingerprint.term === currentFingerprint.term &&
    lastGenerateFingerprint.year === currentFingerprint.year &&
    lastGenerateFingerprint.examSetId === currentFingerprint.examSetId &&
    lastGenerateFingerprint.selectedClass === currentFingerprint.selectedClass &&
    lastGenerateFingerprint.reportType === currentFingerprint.reportType &&
    lastGenerateFingerprint.selectedStudent === currentFingerprint.selectedStudent;

  // When user changes anything (term, exam set, class, report type, or student), clear saved snapshot
  // so we never show or reuse reports for a different selection — avoids wrong PDF (e.g. wrong class/student).
  useEffect(() => {
    setCompletedSnapshotId(null);
    setLastGenerateFingerprint(null);
    setPreviewReports([]);
    queryClient.removeQueries({ queryKey: ['admin', 'report-preview-secondary'] });
  }, [selectedTermKey, selectedExamSetId, selectedClass, reportType, selectedStudent, queryClient]);

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

  // Reports to show: from preview API (no DB) or from generated_reports after "Generate & Save"
  const reportsToDisplay = useMemo(() => {
    if (previewReports.length > 0) {
      return previewReports.map((item: any) =>
        item && typeof item === 'object' && 'report_data' in item ? item : { report_data: item }
      );
    }
    if (!generatedReports?.length) return [] as any[];
    if (reportType === 'single' && selectedStudent) {
      return (generatedReports as any[]).filter((r) => r.student_id === selectedStudent);
    }
    return generatedReports as any[];
  }, [previewReports, generatedReports, reportType, selectedStudent]);

  const hasReportsReady = previewReports.length > 0 || (generatingStep === 'completed' && !!completedSnapshotId && !reportsLoading && !reportsError && generatedReports.length > 0);
  const hasSavedReports = !!completedSnapshotId && !reportsLoading && !reportsError && generatedReports.length > 0;

  const templateDisplayName = useMemo(() => {
    if (!selectedClass) return '';
    const st =
      SECONDARY_TEMPLATES[reportTemplateKey as keyof typeof SECONDARY_TEMPLATES] ??
      SECONDARY_TEMPLATES.template1;
    return st.name;
  }, [selectedClass, reportTemplateKey]);

  useEffect(() => {
    if (!selectedClass) return;
    const autoSecondary = getDefaultSecondaryTemplateKey(selectedClass);
    const prevClass = prevClassForTemplateRef.current;
    const wasSecondary = !!prevClass && (isOLevelClass(prevClass) || isALevelClass(prevClass));
    const isSecondary = isOLevelClass(selectedClass) || isALevelClass(selectedClass);
    const secondaryKeys = new Set(['template1', 'template2', 'template3', 'template4']);

    if (isSecondary) {
      setReportTemplateKey((prev) => {
        const keep = wasSecondary && secondaryKeys.has(prev);
        if (keep) return prev;
        return autoSecondary;
      });
    }

    prevClassForTemplateRef.current = selectedClass;
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    if (!isOLevelClass(selectedClass) && !isALevelClass(selectedClass)) return;
    const allowed = getSecondaryTemplateKeysForClass(selectedClass);
    setReportTemplateKey((prev) =>
      allowed.includes(prev as SecondaryTemplateKey) ? prev : allowed[0]
    );
  }, [selectedClass]);

  const { data: classesForExamSet = [] } = useQuery({
    queryKey: ['admin', 'classes-for-exam-set', pageData?.schoolId ?? '', effectiveExamSetId ?? ''],
    queryFn: () => fetchClassesForExamSet(pageData!.schoolId, effectiveExamSetId!),
    enabled: !!pageData?.schoolId && !!effectiveExamSetId,
    staleTime: STALE_TIME_MS,
  });

  const secondaryClassesForExamSet = useMemo(
    () => classesForExamSet.filter((c) => isOLevelClass(c) || isALevelClass(c)),
    [classesForExamSet]
  );

  const templateKeysForSelect = useMemo(() => {
    if (!selectedClass) return [] as SecondaryTemplateKey[];
    return getSecondaryTemplateKeysForClass(selectedClass);
  }, [selectedClass]);

  const getEffectiveExamSet = (): any => {
    if (!pageData?.schoolId || !selectedClass) return undefined;
    const term = selectedTerm || pageData.currentTerm;
    if (selectedExamSetId) {
      return pageData.examSets.find((es: any) => es.id === selectedExamSetId);
    }
    const forTerm = (pageData.examSets || []).filter(
      (es: any) => es.term === term.term && es.year === term.year
    );
    const isMidTerm = (name: string) => /mid|midterm|mid-term/i.test(String(name || '').trim());
    if (forTerm.length === 0) return undefined;
    if (forTerm.length === 1) return forTerm[0];
    const sorted = [...forTerm].sort((a, b) => {
      const aMid = isMidTerm(a.name || '');
      const bMid = isMidTerm(b.name || '');
      return aMid === bMid ? 0 : aMid ? 1 : -1;
    });
    return sorted[0];
  };

  /** Shared key + body for preview / PDF; null if selection incomplete. */
  const getPreviewKeyAndPayload = (): {
    key: ReturnType<typeof secondaryReportPreviewQueryKey>;
    payload: PreviewInvokeBody;
  } | null => {
    if (!pageData?.schoolId || !selectedClass) return null;
    const term = selectedTerm || pageData.currentTerm;
    const examSet = getEffectiveExamSet();
    if (!examSet) return null;
    if (reportType === 'single' && !selectedStudent) return null;
    const payload: PreviewInvokeBody = {
      schoolId: pageData.schoolId,
      term: term.term,
      year: term.year,
      examSetId: examSet.id,
      className: selectedClass,
      ...(reportType === 'single' && selectedStudent ? { studentId: selectedStudent } : {}),
      ...(isDesktopApp ? { largeClassPreview: true } : {}),
    };
    const key = secondaryReportPreviewQueryKey(
      pageData.schoolId,
      term.term,
      term.year,
      examSet.id,
      selectedClass,
      reportType,
      reportType === 'single' ? selectedStudent : '',
      isDesktopApp
    );
    return { key, payload };
  };

  /** Debounced prefetch for single-student reports once class + student + exam context are known. */
  useEffect(() => {
    if (!pageData?.schoolId || !selectedClass) return;
    if (reportType !== 'single' || !selectedStudent) return;
    const ctx = getPreviewKeyAndPayload();
    if (!ctx) return;

    const timer = window.setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: STALE_TIME_MS,
      });
    }, 450);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getPreviewKeyAndPayload is stable per render; deps mirror selection
  }, [
    pageData?.schoolId,
    selectedTermKey,
    selectedExamSetId,
    selectedClass,
    reportType,
    selectedStudent,
    queryClient,
    pageData?.currentTerm,
    selectedTerm,
  ]);

  const handleGenerateAndSave = async () => {
    if (!pageData?.schoolId || !selectedClass) return;
    const examSet = getEffectiveExamSet();
    if (!examSet) {
      setError('');
      setShowNoResultsModal(true);
      return;
    }
    if (reportType === 'single' && !selectedStudent) {
      setError('Please select a student');
      return;
    }
    const term = selectedTerm || pageData.currentTerm;
    setSaving(true);
    setSaveSuccess('');
    setGenerationError('');
    try {
      const payload = {
        schoolId: pageData.schoolId,
        term: term.term,
        year: term.year,
        examSetId: examSet.id,
        classNames: [selectedClass],
        ...(reportType === 'single' && selectedStudent ? { studentIds: [selectedStudent] } : {}),
      };
      const { data, error: fnError } = await supabase.functions.invoke('generate-reports-final', {
        body: payload,
        ...(isDesktopApp ? { signal: AbortSignal.timeout(15 * 60 * 1000) } : {}),
      });
      if (fnError) throw new Error(await getFunctionInvokeErrorDetail(fnError));
      if (!data?.success || !data?.snapshotId) throw new Error(data?.error || 'Save failed');
      setCompletedSnapshotId(data.snapshotId);
      setLastGenerateFingerprint({
        term: term.term,
        year: term.year,
        examSetId: examSet.id,
        selectedClass,
        reportType,
        selectedStudent: reportType === 'single' ? selectedStudent : '',
      });
      setSaveSuccess(`Reports saved (${data.generatedCount ?? 0} students). You can download PDF or print.`);
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to save reports');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewReport = async () => {
    if (!pageData?.schoolId) return;
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }
    if (reportType === 'single' && !selectedStudent) {
      setError('Please select a student');
      return;
    }
    const ctx = getPreviewKeyAndPayload();
    if (!ctx) {
      setError('');
      setShowNoResultsModal(true);
      return;
    }
    setPreviewing(true);
    setError('');
    setGenerationError('');
    setCompletedSnapshotId(null);
    setGeneratingStep('creating');
    try {
      const reports = await queryClient.fetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: 5 * 60 * 1000, // cache for 5 min — re-clicking preview for same class/exam is instant
      });
      setPreviewReports(reports);
      if (!reports.length) {
        setGenerationError(
          'No report data returned. Live preview is built from table exam_results by the generate-report-preview edge function (all exam sets in this term except when the selected set is Mid Term only). Confirm results exist for the selected class, that class_name in exam_results matches the class you picked, and the function is deployed with valid Supabase env.',
        );
      }
      setGeneratingStep('completed');
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to load preview');
      setGeneratingStep('error');
      setPreviewReports([]);
    } finally {
      setPreviewing(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadSavedPdf = async () => {
    if (!pageData?.schoolId || !selectedClass) return;
    if (reportType === 'single' && !selectedStudent) {
      setError('Please select a student');
      return;
    }

    setDownloadingPdf(true);
    setDownloadPdfStatus('');
    setGenerationError('');

    try {
      const ctx = getPreviewKeyAndPayload();
      if (!ctx) {
        setError('');
        setShowNoResultsModal(true);
        return;
      }

      const cached = queryClient.getQueryData(ctx.key);
      setDownloadPdfStatus(
        Array.isArray(cached) && cached.length > 0 ? 'Preparing PDF…' : 'Generating reports…'
      );

      const reports = await queryClient.fetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: STALE_TIME_MS,
      });
      if (!reports.length) throw new Error('No reports to download');

      if (Array.isArray(cached) && cached.length > 0) {
        setDownloadPdfStatus('Preparing PDF…');
      }

      const reportsForPdf = reports as Record<string, unknown>[];
      const { blob, filename } = await secondaryGeneratePdfFromReports(reportsForPdf, {
        reportTemplateKey,
        reportType,
        selectedStudent,
        onStatus: setDownloadPdfStatus,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      setDownloadPdfStatus('Download started.');
      setTimeout(() => setDownloadPdfStatus(''), 1500);
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to download PDF');
      setGeneratingStep('error');
      setDownloadPdfStatus('');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadClassReportsZip = async () => {
    if (!pageData?.schoolId || !selectedClass) return;
    if (reportType !== 'class') {
      setError('Select Entire Class, then use Download Reports to get a ZIP of all student PDFs.');
      return;
    }
    const ctx = getPreviewKeyAndPayload();
    if (!ctx) {
      setError('');
      setShowNoResultsModal(true);
      return;
    }
    setGenerationError('');
    setDownloadingClassZip(true);
    setClassZipStatus('Loading report data…');
    try {
      const cachedPreview = queryClient.getQueryData<unknown[]>(ctx.key);
      const reports =
        Array.isArray(cachedPreview) && cachedPreview.length > 0
          ? cachedPreview
          : await queryClient.fetchQuery({
              queryKey: ctx.key,
              queryFn: () => invokeReportPreview(ctx.payload),
              staleTime: STALE_TIME_MS,
            });
      if (!reports.length) throw new Error('No reports to download');

      const term = selectedTerm || pageData.currentTerm;
      const examSet = getEffectiveExamSet();
      if (!examSet) throw new Error('No exam set for this term');

      const onZipStatus = (msg: string) => setClassZipStatus(msg);
      const blobs = await adminReportPdfBlobsFromPreviewSecondary(reports, {
        reportTemplateKey,
        reportType: 'class',
        selectedStudent: '',
        onStatus: onZipStatus,
      });

      const zip = new JSZip();
      for (const { filename, blob } of blobs) {
        zip.file(filename, blob);
      }
      setClassZipStatus('Creating ZIP file…');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const examPart = String(examSet.name || 'reports')
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80);
      const classPart = String(selectedClass)
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80);
      const zipName = `${classPart}_reports_${examPart}_T${term.term}_${term.year}.zip`;
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      a.click();
      window.URL.revokeObjectURL(url);
      setClassZipStatus('Download started.');
      setTimeout(() => setClassZipStatus(''), 2000);
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to build ZIP');
    } finally {
      setDownloadingClassZip(false);
    }
  };

  const handleUploadReportsForOnlineReview = async () => {
    if (!pageData?.schoolId || !selectedClass) return;
    if (reportType === 'single' && !selectedStudent) {
      setError('Select a student, then use Upload to publish that PDF for the parent portal.');
      return;
    }
    const ctx = getPreviewKeyAndPayload();
    if (!ctx) {
      setError('');
      setShowNoResultsModal(true);
      return;
    }
    setGenerationError('');
    setUploadSuccess('');
    setUploadingOnlineReview(true);
    setUploadOnlineStatus('Loading report data…');
    let bundlePath: string | null = null;
    try {
      const cachedPreview = queryClient.getQueryData<unknown[]>(ctx.key);
      const reports =
        Array.isArray(cachedPreview) && cachedPreview.length > 0
          ? cachedPreview
          : await queryClient.fetchQuery({
              queryKey: ctx.key,
              queryFn: () => invokeReportPreview(ctx.payload),
              staleTime: STALE_TIME_MS,
            });
      if (!reports.length) throw new Error('No reports to upload');

      const classId = await ensureClassIdForPublish(supabase, pageData.schoolId, selectedClass);
      const term = selectedTerm || pageData.currentTerm;
      const examSet = getEffectiveExamSet();
      if (!examSet) throw new Error('No exam set for this term');

      const onUp = (msg: string) => setUploadOnlineStatus(msg);
      const pdfReportType = reportType === 'single' ? ('single' as const) : ('class' as const);
      const pdfStudentId = reportType === 'single' ? selectedStudent : '';
      const blobs = await adminReportPdfBlobsFromPreviewSecondary(reports, {
        reportTemplateKey,
        reportType: pdfReportType,
        selectedStudent: pdfStudentId,
        onStatus: onUp,
      });

      const studentRows: { student_id: string; storage_object_path: string }[] = [];
      setUploadOnlineStatus('Uploading student PDFs…');
      for (const item of blobs) {
        const studentId = getStudentIdFromPreviewReportData(item.reportData);
        if (!studentId) {
          throw new Error('A report in the preview is missing student_id; cannot upload.');
        }
        const objectPath = buildPublishedStudentReportStoragePath({
          schoolId: pageData.schoolId,
          classId,
          term: term.term,
          year: term.year,
          examSetId: examSet.id,
          studentId,
        });
        
        try {
          // First attempt: upload with upsert
          let { error: upErr } = await supabase.storage
            .from('published-reports')
            .upload(objectPath, item.blob, { upsert: true, contentType: 'application/pdf' });
          
          // If upsert fails with 400, try delete then upload (force replace)
          if (upErr && (upErr.message?.includes('400') || upErr.message?.includes('Bad Request'))) {
            console.warn(`Upsert failed for ${objectPath}, attempting delete + re-upload...`);
            try {
              await supabase.storage.from('published-reports').remove([objectPath]);
              console.log(`Deleted existing file at ${objectPath}`);
            } catch (delErr) {
              console.warn(`Could not delete existing file: ${delErr}`);
            }
            
            // Now upload fresh
            const { error: retryErr } = await supabase.storage
              .from('published-reports')
              .upload(objectPath, item.blob, { contentType: 'application/pdf' });
            
            if (retryErr) {
              console.error('Upload failed even after delete:', objectPath, retryErr);
              throw new Error(formatSupabaseError(retryErr));
            }
            console.log(`Successfully re-uploaded file to ${objectPath}`);
          } else if (upErr) {
            console.error('Upload error for path:', objectPath, 'Error:', upErr);
            throw new Error(formatSupabaseError(upErr));
          }
          
          studentRows.push({ student_id: studentId, storage_object_path: objectPath });
        } catch (err) {
          console.error('Failed to upload PDF for student:', studentId, err);
          throw err;
        }
      }

      if (reportType === 'class') {
        setUploadOnlineStatus('Uploading class ZIP for admin re-download (optional)…');
        try {
          const zip = new JSZip();
          for (const { filename, blob } of blobs) zip.file(filename, blob);
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const bundleObjectPath = buildPublishedClassBundleStoragePath({
            schoolId: pageData.schoolId,
            classId,
            term: term.term,
            year: term.year,
            examSetId: examSet.id,
          });
          const { error: zErr } = await supabase.storage
            .from('published-reports')
            .upload(bundleObjectPath, zipBlob, { upsert: true, contentType: 'application/zip' });
          if (!zErr) bundlePath = bundleObjectPath;
        } catch {
          bundlePath = null;
        }
      }

      setUploadOnlineStatus('Saving published records…');
      if (reportType === 'class') {
        const { error: rpcErr } = await supabase.rpc('replace_published_reports_for_scope', {
          p_school_id: pageData.schoolId,
          p_class_id: classId,
          p_term: term.term,
          p_year: term.year,
          p_exam_set_id: examSet.id,
          p_student_rows: studentRows,
          p_bundle_storage_path: bundlePath,
        });
        if (rpcErr) throw new Error(formatSupabaseError(rpcErr));
      } else {
        const { error: rpcErr } = await supabase.rpc('patch_published_reports_for_students', {
          p_school_id: pageData.schoolId,
          p_class_id: classId,
          p_term: term.term,
          p_year: term.year,
          p_exam_set_id: examSet.id,
          p_student_rows: studentRows,
        });
        if (rpcErr) throw new Error(formatSupabaseError(rpcErr));
      }

      await queryClient.invalidateQueries({ queryKey: ['admin', 'report-records'] });
      setUploadOnlineStatus('');
      setUploadSuccess(
        'Upload saved. Parents can open the portal; staff can use Report Records (History) or Download stored with the same Term, Exam set, Class, and Student.',
      );
      setTimeout(() => setUploadSuccess(''), 12000);
    } catch (err: unknown) {
      const hint = hintForPublishedReportRpc(err);
      setGenerationError(
        hint ? `${formatSupabaseError(err)}\n\nWhat to fix: ${hint}` : formatSupabaseError(err),
      );
      setUploadOnlineStatus('');
    } finally {
      setUploadingOnlineReview(false);
    }
  };

  const handleDownloadPublished = async () => {
    if (!pageData?.schoolId || !selectedClass) return;
    if (reportType === 'single' && !selectedStudent) {
      setError('Please select a student to download a published report.');
      return;
    }
    const examSet = getEffectiveExamSet();
    if (!examSet) {
      setError('Select a term and exam set first.');
      return;
    }
    const term = selectedTerm || pageData.currentTerm;
    setGenerationError('');
    setDownloadingPublished(true);
    setDownloadPublishedStatus('Looking up published files…');
    try {
      const classId = await ensureClassIdForPublish(supabase, pageData.schoolId, selectedClass);

      const examPart = String(examSet.name || 'reports')
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80);
      const classPart = String(selectedClass)
        .replace(/[^\w.\-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80);
      const scopeLabel = `${classPart}_published_${examPart}_T${term.term}_${term.year}`;

      if (reportType === 'single' && selectedStudent) {
        const { data: row, error: rowErr } = await supabase
          .from('published_student_reports')
          .select('storage_object_path')
          .eq('school_id', pageData.schoolId)
          .eq('class_id', classId)
          .eq('term', term.term)
          .eq('year', term.year)
          .eq('exam_set_id', examSet.id)
          .eq('student_id', selectedStudent)
          .maybeSingle();
        if (rowErr) throw new Error(rowErr.message);
        if (!row?.storage_object_path) {
          throw new Error(
            'Nothing stored yet for this student with the current Term and Exam set. Upload for parents first, then download — or switch Exam set to match the one you used when uploading (including “Auto”).',
          );
        }
        setDownloadPublishedStatus('Downloading…');
        const blob = await storageDownloadBlob(supabase, 'published-reports', row.storage_object_path);
        const stu = studentsInClass.find((s) => s.student_id === selectedStudent);
        const downloadName = buildSingleStudentReportPdfFilename({
          students: [
            {
              name: stu?.name ?? 'Student',
              current_class: stu?.current_class ?? selectedClass,
            },
          ],
          examSet: { name: examSet.name, term: term.term, year: term.year },
        });
        await saveBlobAsDownload(blob, downloadName);
        setDownloadPublishedStatus('Download started.');
        setTimeout(() => setDownloadPublishedStatus(''), 2000);
        return;
      }

      const { data: bundle, error: bundleErr } = await supabase
        .from('published_class_report_bundles')
        .select('storage_object_path')
        .eq('school_id', pageData.schoolId)
        .eq('class_id', classId)
        .eq('term', term.term)
        .eq('year', term.year)
        .eq('exam_set_id', examSet.id)
        .maybeSingle();
      if (bundleErr) throw new Error(bundleErr.message);

      if (bundle?.storage_object_path) {
        setDownloadPublishedStatus('Downloading class ZIP…');
        const blob = await storageDownloadBlob(supabase, 'published-reports', bundle.storage_object_path);
        await saveBlobAsDownload(blob, `${scopeLabel}.zip`);
        setDownloadPublishedStatus('Download started.');
        setTimeout(() => setDownloadPublishedStatus(''), 2000);
        return;
      }

      const { data: stuRows, error: stuErr } = await supabase
        .from('published_student_reports')
        .select('student_id, storage_object_path')
        .eq('school_id', pageData.schoolId)
        .eq('class_id', classId)
        .eq('term', term.term)
        .eq('year', term.year)
        .eq('exam_set_id', examSet.id);
      if (stuErr) throw new Error(stuErr.message);
      if (!stuRows?.length) {
        throw new Error(
          'Nothing stored for this class and exam yet. Upload for parents first, or match the same Term and Exam set (including “Auto”) you used when publishing.',
        );
      }

      setDownloadPublishedStatus('Preparing ZIP from stored PDFs…');
      const zip = new JSZip();
      for (const r of stuRows) {
        const blob = await storageDownloadBlob(supabase, 'published-reports', r.storage_object_path);
        const name =
          r.storage_object_path.split('/').pop() || `student_${r.student_id}.pdf`;
        zip.file(name, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await saveBlobAsDownload(zipBlob, `${scopeLabel}.zip`);
      setDownloadPublishedStatus('Download started.');
      setTimeout(() => setDownloadPublishedStatus(''), 2000);
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to download published files');
      setDownloadPublishedStatus('');
    } finally {
      setDownloadingPublished(false);
    }
  };

  const buildHtmlForElement = async (element: HTMLElement): Promise<string> => {
    const cloned = element.cloneNode(true) as HTMLElement;
    const images = cloned.querySelectorAll('img');
    for (const img of Array.from(images)) {
      try {
        if (img.src && !img.src.startsWith('data:')) {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onloadend = () => {
              img.src = reader.result as string;
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch {
        // Ignore individual image failures
      }
    }

    let allCSS = '';
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const cssSheet = sheet as CSSStyleSheet;
          if (cssSheet.cssRules) {
            for (const rule of Array.from(cssSheet.cssRules)) {
              allCSS += rule.cssText + '\n';
            }
          }
        } catch {
          // Cross-origin stylesheet - skip
        }
      }
    } catch {
      // Ignore CSS extraction errors
    }

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      ${allCSS}
    </style>
  </head>
  <body>
    ${cloned.innerHTML}
  </body>
</html>`;
  };

  // NOTE: From the SPA we cannot reliably call the Next.js PDF APIs that live on a different host.
  // To guarantee a working experience everywhere, we fall back to the browser's print dialog.
  // Users can then choose "Save as PDF" in the print UI to download a real PDF.
  const downloadPdfFromHtml = async (_htmlContent: string, _filename: string) => {
    window.print();
  };

  const pageShell = (
    eyebrow: string,
    title: string,
    subtitle: string,
    body: ReactNode
  ) => (
    <AdminPageWrapper eyebrow={eyebrow} title={title} subtitle={subtitle}>
      {body}
    </AdminPageWrapper>
  );

  if (schoolTypePending) {
    return pageShell(
      'Academic reports',
      'Student Report Generator',
      'Generate and download student academic reports.',
      <div className="flex items-center justify-center py-16">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ac-border)] border-t-emerald-500"
          aria-hidden
        />
      </div>
    );
  }

  if (schoolType !== 'Secondary') {
    return <Navigate to="/dashboard/admin/reports/generate" replace />;
  }

  if (isLoading) {
    return pageShell(
      'Academic reports',
      'Student Report Generator',
      'Generate and download student academic reports.',
      <div className="flex items-center justify-center py-16">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--ac-border)] border-t-emerald-500"
          aria-hidden
        />
      </div>
    );
  }

  if (!pageData) {
    return pageShell(
      'Academic reports',
      'Student Report Generator',
      'Generate and download student academic reports.',
      <div className={`${adminCardClass} ac-text-secondary`}>
        Could not load school data. Check your account or try again later.
      </div>
    );
  }

  const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.035)' : '#ffffff';
  const cardShadow = isDark
    ? '0 8px 32px 0 rgba(0, 0, 0, 0.35)'
    : '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)';
  const inputBorder = `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.14)' : '#cbd5e1'}`;
  const inputBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? 'rgba(226, 232, 240, 0.72)' : '#64748b';

  return (
    <AdminPageWrapper>
      {/* ── ROW 0: POS HEADER & ACTIVE SESSION PILL ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: isDark ? '#3de8a0' : '#059669',
              marginBottom: 4,
            }}
          >
            <span
              style={{
                width: 14,
                height: 2,
                borderRadius: 1,
                background: isDark ? '#3de8a0' : '#059669',
              }}
            />
            <GraduationCap size={14} />
            <span>O-Level & A-Level Academic Reports</span>
          </div>
          <h1
            style={{
              fontFamily: SORA,
              fontSize: 26,
              fontWeight: 800,
              color: textColor,
              letterSpacing: '-0.4px',
              margin: '0 0 4px 0',
            }}
          >
            Secondary Report Generator
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: textMuted }}>
            Generate, inspect, and bulk publish ministry-compliant secondary school report cards (S1–S6).
          </p>
        </div>

        {/* Active Session Pill */}
        {pageData && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 14px',
              borderRadius: 12,
              background: cardBg,
              border: cardBorder,
              boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isDark ? 'rgba(61,232,160,0.12)' : 'rgba(5,150,105,0.08)',
                color: isDark ? '#3de8a0' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={16} />
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: textMuted }}>
                Active Session
              </div>
              <div style={{ fontFamily: SORA, fontSize: 13, fontWeight: 700, color: textColor }}>
                Term {(selectedTerm || pageData.currentTerm).term}, {(selectedTerm || pageData.currentTerm).year}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ROW 1: 4-CARD LIVE KPI STRIP ─────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* KPI 1: Academic Session */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#3de8a0' : '#059669' }}>
              Academic Term
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: isDark ? 'rgba(61,232,160,0.1)' : 'rgba(5,150,105,0.08)', color: isDark ? '#3de8a0' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={14} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 18, fontWeight: 800, color: textColor }}>
            Term {(selectedTerm || pageData?.currentTerm)?.term ?? 1}, {(selectedTerm || pageData?.currentTerm)?.year ?? 2026}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
            {selectedTerm?.term === pageData?.currentTerm?.term && selectedTerm?.year === pageData?.currentTerm?.year
              ? 'Current operational session'
              : 'Historical archival session'}
          </div>
        </div>

        {/* KPI 2: Assessment Exam Set */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#38bdf8' : '#0284c7' }}>
              Assessment Set
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(2,132,199,0.08)', color: isDark ? '#38bdf8' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={14} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 16, fontWeight: 800, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedExamSetId
              ? (examSetsForSelectedTerm.find((e: any) => e.id === selectedExamSetId)?.name || 'Custom Set')
              : 'Auto (Latest Set)'}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
            {examSetsForSelectedTerm.length} assessment sets available
          </div>
        </div>

        {/* KPI 3: Target Class Enrollment */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#c084fc' : '#7e22ce' }}>
              Secondary Enrollment
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: isDark ? 'rgba(192,132,252,0.1)' : 'rgba(126,34,206,0.08)', color: isDark ? '#c084fc' : '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <School size={14} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 18, fontWeight: 800, color: textColor }}>
            {selectedClass ? `${studentsInClass.length} Students` : 'Select Class'}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
            {selectedClass ? `Senior roster for ${selectedClass}` : 'Senior secondary streams'}
          </div>
        </div>

        {/* KPI 4: Output Scope */}
        <div
          style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: 14,
            padding: '14px 16px',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: isDark ? '#fbbf24' : '#b45309' }}>
              Generation Scope
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(180,83,9,0.08)', color: isDark ? '#fbbf24' : '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={14} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 16, fontWeight: 800, color: textColor }}>
            {reportType === 'single' ? 'Single Student' : 'Entire Class'}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
            {reportType === 'single'
              ? (selectedStudent ? 'Student profile selected' : 'Awaiting student pick')
              : 'Bulk PDF / ZIP generation'}
          </div>
        </div>
      </div>

      {/* ── ROW 2: INTERACTIVE SCOPE SWITCHER ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* Card 1: Single Student */}
        <div
          onClick={() => {
            setReportType('single');
          }}
          style={{
            background: cardBg,
            border: `2px solid ${reportType === 'single' ? (isDark ? '#3de8a0' : '#059669') : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')}`,
            borderRadius: 14,
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: reportType === 'single'
              ? (isDark ? '0 6px 20px rgba(61,232,160,0.15)' : '0 4px 16px rgba(5,150,105,0.1)')
              : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: reportType === 'single'
                  ? (isDark ? 'rgba(61,232,160,0.15)' : 'rgba(5,150,105,0.1)')
                  : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: reportType === 'single'
                  ? (isDark ? '#3de8a0' : '#059669')
                  : (isDark ? '#94a3b8' : '#64748b'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div style={{ fontFamily: SORA, fontSize: 14, fontWeight: 700, color: textColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                Single Student Report
                {reportType === 'single' && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: isDark ? 'rgba(61,232,160,0.2)' : 'rgba(5,150,105,0.12)', color: isDark ? '#3de8a0' : '#059669', fontWeight: 700 }}>
                    ACTIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                Inspect and generate a dedicated secondary report card for one student.
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Entire Class Batch */}
        <div
          onClick={() => {
            setReportType('class');
            setSelectedStudent('');
          }}
          style={{
            background: cardBg,
            border: `2px solid ${reportType === 'class' ? (isDark ? '#3de8a0' : '#059669') : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')}`,
            borderRadius: 14,
            padding: '16px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: reportType === 'class'
              ? (isDark ? '0 6px 20px rgba(61,232,160,0.15)' : '0 4px 16px rgba(5,150,105,0.1)')
              : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: reportType === 'class'
                  ? (isDark ? 'rgba(61,232,160,0.15)' : 'rgba(5,150,105,0.1)')
                  : (isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                color: reportType === 'class'
                  ? (isDark ? '#3de8a0' : '#059669')
                  : (isDark ? '#94a3b8' : '#64748b'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={18} />
            </div>
            <div>
              <div style={{ fontFamily: SORA, fontSize: 14, fontWeight: 700, color: textColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                Entire Class Batch
                {reportType === 'class' && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: isDark ? 'rgba(61,232,160,0.2)' : 'rgba(5,150,105,0.12)', color: isDark ? '#3de8a0' : '#059669', fontWeight: 700 }}>
                    ACTIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                Bulk produce, archive, and download merged PDFs or ZIP files for all pupils in senior class.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: REPORT CONFIGURATION CARD ──────────────────────────────────── */}
      <div
        style={{
          background: cardBg,
          border: cardBorder,
          borderRadius: 16,
          padding: '22px 24px',
          boxShadow: cardShadow,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isDark ? 'rgba(61,232,160,0.1)' : 'rgba(5,150,105,0.08)',
              color: isDark ? '#3de8a0' : '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileSpreadsheet size={16} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: SORA,
                fontSize: 16,
                fontWeight: 700,
                color: textColor,
                margin: 0,
              }}
            >
              Secondary Report Parameters & Assessment Controls
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: textMuted }}>
              Specify the academic term, assessment set, and senior class (S1–S6) to generate accurate grades.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Term Selector */}
          {pageData && pageData.allTerms.length > 0 && (
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: textColor,
                  marginBottom: 6,
                }}
              >
                <Calendar size={13} style={{ color: isDark ? '#3de8a0' : '#059669' }} />
                <span>Academic Term</span>
              </label>
              <select
                value={selectedTermKey || `${pageData.currentTerm.term}-${pageData.currentTerm.year}`}
                onChange={(e) => {
                  setSelectedTermKey(e.target.value);
                  setSelectedExamSetId('');
                  setSelectedClass('');
                  setSelectedStudent('');
                }}
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 10,
                  border: inputBorder,
                  background: inputBg,
                  color: textColor,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  outline: 'none',
                  boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                {pageData.allTerms.map((tm) => {
                  const key = `${tm.term}-${tm.year}`;
                  const isCurrent =
                    tm.term === pageData.currentTerm.term && tm.year === pageData.currentTerm.year;
                  return (
                    <option key={key} value={key}>
                      Term {tm.term}, {tm.year}{isCurrent ? ' (Current)' : ''}
                    </option>
                  );
                })}
              </select>
              <p style={{ fontSize: 11, color: textMuted, marginTop: 4, margin: '4px 0 0 0' }}>
                Operational academic calendar session
              </p>
            </div>
          )}

          {/* Exam Set Selector */}
          {pageData && examSetsForSelectedTerm.length > 0 && (
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: textColor,
                  marginBottom: 6,
                }}
              >
                <Layers size={13} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                <span>Exam Assessment Set</span>
              </label>
              <select
                value={selectedExamSetId}
                onChange={(e) => {
                  setSelectedExamSetId(e.target.value);
                  setSelectedClass('');
                  setSelectedStudent('');
                }}
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 10,
                  border: inputBorder,
                  background: inputBg,
                  color: textColor,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  outline: 'none',
                  boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <option value="">Auto (Latest assessment set for term)</option>
                {examSetsForSelectedTerm.map((es: any) => (
                  <option key={es.id} value={es.id}>
                    {es.name || `Set - Term ${es.term}, ${es.year}`}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: textMuted, marginTop: 4, margin: '4px 0 0 0' }}>
                Mid Term or End of Term assessment
              </p>
            </div>
          )}

          {/* Class Selector */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: textColor,
                marginBottom: 6,
              }}
            >
              <School size={13} style={{ color: isDark ? '#c084fc' : '#7e22ce' }} />
              <span>Senior Class Stream</span>
            </label>
            {effectiveExamSetId ? (
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStudent('');
                }}
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 10,
                  border: inputBorder,
                  background: inputBg,
                  color: textColor,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  outline: 'none',
                  boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <option value="">Select Senior Class (S1–S6)</option>
                {secondaryClassesForExamSet.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: inputBorder,
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                  color: textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: 12,
                }}
              >
                Pick Term & Exam Set first
              </div>
            )}
            {effectiveExamSetId && secondaryClassesForExamSet.length === 0 ? (
              <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, margin: '4px 0 0 0' }}>
                No senior secondary (S1–S6) results for this exam set yet
              </p>
            ) : (
              <p style={{ fontSize: 11, color: textMuted, marginTop: 4, margin: '4px 0 0 0' }}>
                {secondaryClassesForExamSet.length} classes available
              </p>
            )}
          </div>

          {/* Report Template Selector */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: textColor,
                marginBottom: 6,
              }}
            >
              <BookOpen size={13} style={{ color: isDark ? '#fbbf24' : '#b45309' }} />
              <span>Curriculum Template</span>
            </label>
            {!selectedClass ? (
              <div
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: inputBorder,
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                  color: textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: 12,
                }}
              >
                Select a class first
              </div>
            ) : (
              <select
                value={reportTemplateKey}
                onChange={(e) => setReportTemplateKey(e.target.value)}
                style={{
                  width: '100%',
                  height: 42,
                  borderRadius: 10,
                  border: inputBorder,
                  background: inputBg,
                  color: textColor,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  outline: 'none',
                }}
              >
                {templateKeysForSelect.map((k) => (
                  <option key={k} value={k}>
                    {SECONDARY_TEMPLATES[k].name}
                  </option>
                ))}
              </select>
            )}
            <p style={{ fontSize: 11, color: textMuted, marginTop: 4, margin: '4px 0 0 0' }}>
              Ministry secondary layout
            </p>
          </div>
        </div>

        {/* Student Selector – only in Single Student Mode */}
        {reportType === 'single' && (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: textColor,
                marginBottom: 6,
              }}
            >
              <User size={13} style={{ color: isDark ? '#3de8a0' : '#059669' }} />
              <span>Select Pupil / Trainee</span>
            </label>
            <StudentSelectCombobox
              key={`${selectedClass || 'noclass'}-${reportType}`}
              students={studentsInClass}
              value={selectedStudent}
              onChange={setSelectedStudent}
              disabled={!selectedClass}
            />
          </div>
        )}

        {/* Alerts & Messages */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
              color: isDark ? '#fca5a5' : '#b91c1c',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {generationError && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
              color: isDark ? '#fca5a5' : '#b91c1c',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>{generationError}</div>
            {generatingStep === 'error' ? (
              <button
                type="button"
                onClick={() => {
                  setGeneratingStep('idle');
                  setGenerationError('');
                  void handlePreviewReport();
                }}
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: isDark ? '#3de8a0' : '#059669',
                  background: 'transparent',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Try again
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setGenerationError('')}
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: isDark ? '#fca5a5' : '#b91c1c',
                  background: 'transparent',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {saveSuccess && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: isDark ? 'rgba(61,232,160,0.15)' : 'rgba(5,150,105,0.08)',
              border: `1px solid ${isDark ? 'rgba(61,232,160,0.3)' : 'rgba(5,150,105,0.2)'}`,
              color: isDark ? '#3de8a0' : '#059669',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{saveSuccess}</span>
          </div>
        )}

        {uploadSuccess && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: isDark ? 'rgba(61,232,160,0.15)' : 'rgba(5,150,105,0.08)',
              border: `1px solid ${isDark ? 'rgba(61,232,160,0.3)' : 'rgba(5,150,105,0.2)'}`,
              color: isDark ? '#3de8a0' : '#059669',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {uploadingOnlineReview && uploadOnlineStatus ? (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: isDark ? 'rgba(56,189,248,0.15)' : 'rgba(2,132,199,0.08)',
              border: `1px solid ${isDark ? 'rgba(56,189,248,0.3)' : 'rgba(2,132,199,0.2)'}`,
              color: isDark ? '#38bdf8' : '#0284c7',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {uploadOnlineStatus}
          </div>
        ) : null}

        {/* ── ACTION STATION: HERO BUTTON TOOLBAR ─────────────────────────────── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingTop: 4 }}>
          {/* Primary Action: Preview Report */}
          <button
            type="button"
            onClick={handlePreviewReport}
            disabled={previewing || !selectedClass || (reportType === 'single' && !selectedStudent)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              padding: '0 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              border: 'none',
              fontFamily: SORA,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: (previewing || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 'not-allowed' : 'pointer',
              opacity: (previewing || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 0.5 : 1,
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <Eye size={17} />
            <span>{previewing ? 'Rendering Preview…' : 'Preview Report'}</span>
          </button>

          {/* Action 2: Download PDF */}
          <button
            type="button"
            onClick={handleDownloadSavedPdf}
            disabled={
              downloadingPdf ||
              downloadingClassZip ||
              downloadingPublished ||
              uploadingOnlineReview ||
              saving ||
              !selectedClass ||
              (reportType === 'single' && !selectedStudent)
            }
            title="Download PDF directly — no processing or archiving step required"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              padding: '0 18px',
              borderRadius: 10,
              background: isDark
                ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                : 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              fontFamily: SORA,
              fontSize: 13,
              fontWeight: 700,
              cursor: (downloadingPdf || downloadingClassZip || downloadingPublished || uploadingOnlineReview || saving || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 'not-allowed' : 'pointer',
              opacity: (downloadingPdf || downloadingClassZip || downloadingPublished || uploadingOnlineReview || saving || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 0.5 : 1,
              boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <FileDown size={17} />
            <span>{downloadingPdf ? 'Building PDF…' : 'Download PDF'}</span>
          </button>

          {/* Action 3: Save to Archive */}
          <button
            type="button"
            onClick={handleGenerateAndSave}
            disabled={saving || !selectedClass || (reportType === 'single' && !selectedStudent)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              padding: '0 16px',
              borderRadius: 10,
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
              border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
              color: textColor,
              fontSize: 13,
              fontWeight: 600,
              cursor: (saving || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 'not-allowed' : 'pointer',
              opacity: (saving || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 0.5 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <Archive size={16} style={{ color: isDark ? '#3de8a0' : '#059669' }} />
            <span>{saving ? 'Saving…' : 'Generate & Save'}</span>
          </button>

          {/* Action 4: Download Reports (ZIP) – Class mode only */}
          {reportType === 'class' ? (
            <button
              type="button"
              onClick={handleDownloadClassReportsZip}
              disabled={
                downloadingClassZip ||
                downloadingPdf ||
                downloadingPublished ||
                uploadingOnlineReview ||
                saving ||
                !selectedClass
              }
              title="Entire class only: build fresh PDFs from current data and download a ZIP"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 44,
                padding: '0 16px',
                borderRadius: 10,
                background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
                color: textColor,
                fontSize: 13,
                fontWeight: 600,
                cursor: (downloadingClassZip || downloadingPdf || downloadingPublished || uploadingOnlineReview || saving || !selectedClass) ? 'not-allowed' : 'pointer',
                opacity: (downloadingClassZip || downloadingPdf || downloadingPublished || uploadingOnlineReview || saving || !selectedClass) ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <FolderArchive size={16} style={{ color: isDark ? '#fbbf24' : '#b45309' }} />
              <span>{downloadingClassZip ? 'Building ZIP…' : 'Download Reports (ZIP)'}</span>
            </button>
          ) : null}

          {/* Action 5: Upload for Online Review */}
          <button
            type="button"
            onClick={handleUploadReportsForOnlineReview}
            disabled={
              uploadingOnlineReview ||
              downloadingClassZip ||
              downloadingPdf ||
              downloadingPublished ||
              saving ||
              !selectedClass ||
              (reportType === 'single' && !selectedStudent)
            }
            title={
              reportType === 'class'
                ? 'Publish every student in this class for the parent portal.'
                : 'Publish this student’s PDF for the parent portal.'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              padding: '0 16px',
              borderRadius: 10,
              background: isDark ? 'rgba(56,189,248,0.12)' : 'rgba(2,132,199,0.08)',
              border: `1.5px solid ${isDark ? 'rgba(56,189,248,0.25)' : 'rgba(2,132,199,0.2)'}`,
              color: isDark ? '#38bdf8' : '#0284c7',
              fontSize: 13,
              fontWeight: 600,
              cursor: (uploadingOnlineReview || downloadingClassZip || downloadingPdf || downloadingPublished || saving || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 'not-allowed' : 'pointer',
              opacity: (uploadingOnlineReview || downloadingClassZip || downloadingPdf || downloadingPublished || saving || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 0.5 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <UploadCloud size={16} />
            <span>{uploadingOnlineReview ? 'Uploading…' : 'Upload'}</span>
          </button>

          {/* Action 6: Download Stored */}
          <button
            type="button"
            onClick={handleDownloadPublished}
            disabled={
              downloadingPublished ||
              downloadingClassZip ||
              downloadingPdf ||
              uploadingOnlineReview ||
              saving ||
              !selectedClass ||
              (reportType === 'single' && !selectedStudent)
            }
            title="Download files already published to storage for this exam"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              padding: '0 16px',
              borderRadius: 10,
              background: isDark ? 'rgba(192,132,252,0.12)' : 'rgba(126,34,206,0.08)',
              border: `1.5px solid ${isDark ? 'rgba(192,132,252,0.25)' : 'rgba(126,34,206,0.2)'}`,
              color: isDark ? '#c084fc' : '#7e22ce',
              fontSize: 13,
              fontWeight: 600,
              cursor: (downloadingPublished || downloadingClassZip || downloadingPdf || uploadingOnlineReview || saving || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 'not-allowed' : 'pointer',
              opacity: (downloadingPublished || downloadingClassZip || downloadingPdf || uploadingOnlineReview || saving || !selectedClass || (reportType === 'single' && !selectedStudent)) ? 0.5 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={16} />
            <span>{downloadingPublished ? 'Preparing…' : 'Download stored'}</span>
          </button>
        </div>

        {downloadPdfStatus && (
          <p style={{ margin: '10px 0 0 0', fontSize: 12.5, color: textMuted }}>{downloadPdfStatus}</p>
        )}
        {(classZipStatus || downloadPublishedStatus) && (
          <p style={{ margin: '6px 0 0 0', fontSize: 12.5, color: textMuted }}>
            {[classZipStatus, downloadPublishedStatus].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* ── ROW 4: STAGING CANVAS WHEN EMPTY ─────────────────────────────────── */}
      {(!previewReports.length && (!generatingStep || generatingStep === 'idle') && !reportsToDisplay.length) && (
        <div
          style={{
            borderRadius: 16,
            border: `2px dashed ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
            background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: isDark ? 'rgba(61,232,160,0.12)' : 'rgba(5,150,105,0.08)',
              color: isDark ? '#3de8a0' : '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <FileSpreadsheet size={28} />
          </div>
          <div
            style={{
              fontFamily: SORA,
              fontSize: 18,
              fontWeight: 700,
              color: textColor,
              marginBottom: 6,
            }}
          >
            Secondary Report Card Staging Ready
          </div>
          <p
            style={{
              maxWidth: 520,
              margin: '0 auto 20px auto',
              fontSize: 13,
              lineHeight: 1.6,
              color: textMuted,
            }}
          >
            Select the academic term, assessment set, senior class (S1–S6), and student above, then click{' '}
            <strong style={{ color: isDark ? '#3de8a0' : '#059669' }}>Preview Report</strong> to inspect
            subject scores, aggregates, and teacher remarks before printing or publishing.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                fontSize: 11.5,
                color: isDark ? '#cbd5e1' : '#475569',
              }}
            >
              <CheckCircle2 size={13} style={{ color: isDark ? '#3de8a0' : '#059669' }} />
              <span>UNEB O-Level & A-Level Standards</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                fontSize: 11.5,
                color: isDark ? '#cbd5e1' : '#475569',
              }}
            >
              <CheckCircle2 size={13} style={{ color: isDark ? '#3de8a0' : '#059669' }} />
              <span>Competency-Based New Curriculum & Heritage</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                fontSize: 11.5,
                color: isDark ? '#cbd5e1' : '#475569',
              }}
            >
              <CheckCircle2 size={13} style={{ color: isDark ? '#3de8a0' : '#059669' }} />
              <span>Parent Portal Direct Publishing</span>
            </div>
          </div>
        </div>
      )}

          {/* Report Preview – from preview API (no DB writes) or from generated_reports after Generate & Save */}
          {(previewReports.length > 0 || (generatingStep === 'completed' && completedSnapshotId && !reportsLoading && !reportsError && generatedReports.length > 0)) && reportsToDisplay.length > 0 && (() => {
            return (
              <div
                id="report-preview-print-area"
                className="report-preview-print ac-glass-card mt-8 rounded-xl border border-[var(--ac-border)] p-6 transition-colors hover:border-emerald-500/30 dark:hover:border-emerald-400/20"
              >
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2
                    className="ac-text-primary text-lg font-normal tracking-tight sm:text-xl"
                    style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    Report Preview
                  </h2>
                  <div className="flex flex-col items-end gap-1 text-sm ac-text-secondary sm:text-right">
                    {templateDisplayName && <span>Template: {templateDisplayName}</span>}
                  </div>
                </div>
                <div className="ac-glass-card max-h-[80vh] overflow-x-hidden overflow-y-auto rounded-lg border border-[var(--ac-border)] p-4">
                  <div
                    className="report-preview-doc-surface mx-auto space-y-8 rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-sm print:border-0 print:bg-white print:shadow-none"
                    style={{ width: '210mm', maxWidth: '100%' }}
                  >
                    {reportsToDisplay.map((report: any, idx: number) => (
                      <div key={report.id || report.report_data?.students?.[0]?.student_id || idx} className="report-student-card">
                        <SecondaryReportPreviewBlock reportData={report.report_data} templateKey={reportTemplateKey} />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-4 ac-text-muted text-sm text-center">
                  This preview shows exactly how the report{reportsToDisplay.length > 1 ? 's' : ''} will look when downloaded or printed.
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
            <p className="ac-text-secondary mb-4">
              No results found for the selected term. There is no Mid Term, End of Term, or Beginning of Term exam set for Term {(selectedTerm || pageData?.currentTerm)?.term}, {(selectedTerm || pageData?.currentTerm)?.year}. Create an exam set for this term to generate reports.
            </p>
            <button
              type="button"
              onClick={() => setShowNoResultsModal(false)}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-md shadow-emerald-900/25 transition hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
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
                <div className="rounded-2xl border border-[var(--ac-border)] ac-glass-card p-4">
                  <h3
                    className="ac-text-primary mb-2 font-normal tracking-tight"
                    style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm ac-text-secondary">
                    <div>
                      <span className="ac-text-muted">Average:</span>{' '}
                      {(() => {
                        const a = viewingReport.reportData?.students?.[0]?.summary?.average;
                        if (a == null || a === '') return '—';
                        return `${formatAverageWhole(a)}%`;
                      })()}
                    </div>
                    <div><span className="ac-text-muted">Position:</span> {viewingReport.reportData?.students?.[0]?.summary?.classPosition ?? '—'}</div>
                    <div><span className="ac-text-muted">Division:</span> {viewingReport.reportData?.students?.[0]?.summary?.division ?? '—'}</div>
                    <div><span className="ac-text-muted">Aggregate:</span> {viewingReport.reportData?.students?.[0]?.summary?.aggregate?.toFixed(2) ?? '—'}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--ac-border)] ac-glass-card p-4">
                  <h3
                    className="ac-text-primary mb-2 font-normal tracking-tight"
                    style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    Subjects
                  </h3>
                  <div className="space-y-2">
                    {viewingReport.reportData?.students?.[0]?.results?.map((result: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm ac-text-secondary">
                        <span>{result.subject}</span>
                        <span className="font-semibold ac-text-primary">{result.marks_obtained} / {result.total_marks} ({result.grade})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingReport(null)}
                  className="w-full rounded-xl ac-glass-btn-secondary px-4 py-3 font-medium ac-text-primary"
                >
                  Close
                </button>
              </div>
            </GlassModal>
          )}
    </AdminPageWrapper>
  );
}
