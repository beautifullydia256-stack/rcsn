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
import { getCurrentTerm } from '../../../lib/termStructure';
import { resolveCurrentSchoolTerm } from '../../../lib/adminFinanceTerm';
import { pdfDownloadFilenameFromResponse } from '../../../lib/pdfAttachmentFilename';
import { isElectronDesktop, htmlChunksToMergedPdfBlob } from '../../../lib/desktopPdf';
import { isDesktopApp } from '../../../lib/isDesktopApp';
import { getFunctionInvokeErrorDetail } from '../../../lib/supabaseFunctionInvokeError';
import { formatSupabaseError, hintForPublishedReportRpc } from '../../../lib/supabaseError';
import { computeSecondaryHtmlPdfUseOlevelStandardDynamic } from '../../../lib/secondaryPdfHtmlOptions';
import {
  buildSingleStudentReportPdfFilename,
  buildClassBundleReportPdfFilename,
} from '../../../lib/reportPdfFilenames';
import { formatAverageWhole } from '../../../lib/reportUtils';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { isALevelClass, isOLevelClass } from '../../../components/reports/templates/helpers';
import {
  SECONDARY_TEMPLATES,
  getDefaultSecondaryTemplateKey,
  getSecondaryTemplateKeysForClass,
  type SecondaryTemplateKey,
} from '../../../templates/secondary';
import { SecondaryBuiltInHtmlPreview } from '../../../components/reports/SecondaryBuiltInHtmlPreview';
import { renderTemplateHTML } from '../../../services/templateHTMLGenerator';
import { resolveSchoolAndStudentPhotosForReportData } from '../../../lib/reportImageDataUrl';
import {
  buildSecondaryShapedStudent,
  pickSecondaryTemplateRootFields,
} from '../../../reports/secondary/buildSecondaryShapedStudent';
import { fetchClassIdBySchoolAndName } from '../../../lib/classIdLookup';
import { adminReportPdfBlobsFromPreviewSecondary } from '../../../lib/adminReportPdfFromPreview';
import {
  buildPublishedClassBundleStoragePath,
  buildPublishedStudentReportStoragePath,
  getStudentIdFromPreviewReportData,
} from '../../../lib/publishedReportPaths';
import { triggerBlobDownload, storageDownloadBlob } from '../../../lib/downloadBlob';
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

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsInClass;
    const q = studentSearch.toLowerCase();
    return studentsInClass.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.admission_number || '').toLowerCase().includes(q)
    );
  }, [studentsInClass, studentSearch]);

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
      await queryClient.cancelQueries({ queryKey: ctx.key });
      queryClient.removeQueries({ queryKey: ctx.key });
      const reports = await queryClient.fetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: 0,
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

    const baseUrl =
      import.meta.env.VITE_PDF_API_URL ??
      (import.meta.env.DEV ? 'http://localhost:3001' : '');

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

      await queryClient.cancelQueries({ queryKey: ctx.key });
      queryClient.removeQueries({ queryKey: ctx.key });
      const reports = await queryClient.fetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: 0,
      });
      if (!reports.length) throw new Error('No reports to download');

      setDownloadPdfStatus('Rendering HTML…');

      // Render HTML on the client (same function as preview) then send as htmlContent —
      // avoids Vercel src/ dynamic import failures in the standalone api/pdf/generate function.
      const htmlChunks = await Promise.all(
        reports.map(async (rd) => {
          const { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(
            rd as { school?: Record<string, unknown>; students?: unknown[] }
          );
          return renderTemplateHTML(rd, reportTemplateKey, logo, photo);
        })
      );

      setDownloadPdfStatus('Preparing PDF…');

      if (isElectronDesktop()) {
        setDownloadPdfStatus('Generating PDF…');
        const useDynamic = computeSecondaryHtmlPdfUseOlevelStandardDynamic(
          reports[0] as Record<string, unknown>,
          reportTemplateKey,
          reports.length
        );
        const blob = await htmlChunksToMergedPdfBlob({
          htmlChunks,
          useOlevelStandardDynamic: useDynamic,
          onChunk: (i, t) =>
            setDownloadPdfStatus(t > 1 ? `Generating PDF (${i}/${t})…` : 'Generating PDF…'),
        });
        const filename =
          reports.length > 1
            ? buildClassBundleReportPdfFilename(reports as Record<string, unknown>[])
            : buildSingleStudentReportPdfFilename(reports[0] as Record<string, unknown>);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        setDownloadPdfStatus('Download started.');
        setTimeout(() => setDownloadPdfStatus(''), 1500);
        return;
      }

      const extractHead = (html: string) => {
        const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        return m ? m[1] : '';
      };
      const extractBody = (html: string) => {
        const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        return m ? m[1] : html;
      };
      const combinedHtml =
        htmlChunks.length === 1
          ? htmlChunks[0]
          : `<!DOCTYPE html><html><head>${extractHead(htmlChunks[0])}<style>.pdf-student-sheet{page-break-after:always;}</style></head><body>${htmlChunks.map((h) => `<div class="pdf-student-sheet">${extractBody(h)}</div>`).join('\n')}</body></html>`;

      const response = await fetch(`${baseUrl}/api/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: combinedHtml,
          reportData: reports[0],
          htmlPdfReportCount: reports.length,
          templateKey: reportTemplateKey,
        }),
      });

      if (!response.ok) {
        let errBody: { error?: string } = {};
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          errBody = await response.json().catch(() => ({}));
        } else {
          await response.text();
        }
        const msg =
          response.status === 413
            ? 'PDF request was too large (413). Try again; if it persists, download one student at a time or contact support.'
            : typeof errBody?.error === 'string'
              ? errBody.error
              : response.status === 500
                ? `PDF generation failed (500). Check Vercel → Deployments → Functions → Logs for the error.`
                : `Failed to generate PDF (${response.status})`;
        throw new Error(msg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fallbackName =
        reportType === 'single' && selectedStudent
          ? 'student_report.pdf'
          : 'class_reports.pdf';
      a.href = url;
      a.download = pdfDownloadFilenameFromResponse(response, fallbackName);
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
    setClassZipStatus('Loading fresh report data…');
    try {
      await queryClient.cancelQueries({ queryKey: ctx.key });
      queryClient.removeQueries({ queryKey: ctx.key });
      const reports = await queryClient.fetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: 0,
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
    setUploadOnlineStatus('Loading fresh report data…');
    let bundlePath: string | null = null;
    try {
      await queryClient.cancelQueries({ queryKey: ctx.key });
      queryClient.removeQueries({ queryKey: ctx.key });
      const reports = await queryClient.fetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: 0,
      });
      if (!reports.length) throw new Error('No reports to upload');

      const classId = await fetchClassIdBySchoolAndName(supabase, pageData.schoolId, selectedClass);
      if (!classId) {
        throw new Error(
          'This class name was not found in the classes table. It must match exactly for upload.'
        );
      }
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
        const { error: upErr } = await supabase.storage
          .from('published-reports')
          .upload(objectPath, item.blob, { upsert: true, contentType: 'application/pdf' });
        if (upErr) throw new Error(formatSupabaseError(upErr));
        studentRows.push({ student_id: studentId, storage_object_path: objectPath });
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
      const classId = await fetchClassIdBySchoolAndName(supabase, pageData.schoolId, selectedClass);
      if (!classId) {
        throw new Error('This class was not found in the classes table.');
      }

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
        const base = row.storage_object_path.split('/').pop() || 'report.pdf';
        triggerBlobDownload(blob, base);
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
        triggerBlobDownload(blob, `${scopeLabel}.zip`);
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
      triggerBlobDownload(zipBlob, `${scopeLabel}.zip`);
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

  return (
    <AdminPageWrapper
      eyebrow="Academic reports"
      title="Secondary report generator"
      subtitle="O-Level and A-Level classes only — separate from the primary school generator."
    >
      <div className={`${adminCardClass} rounded-xl border border-[var(--ac-border)]`}>
          <h2
            className="ac-text-primary mb-4 text-lg font-normal tracking-tight sm:text-xl"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Report Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Report Type */}
            <div>
              <label className="block ac-text-secondary text-sm font-medium mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value as 'single' | 'class');
                  setSelectedStudent('');
                }}
                className="ac-input w-full rounded-lg px-3 py-2 min-h-0"
              >
                <option value="single">Single Student</option>
                <option value="class">Entire Class</option>
              </select>
            </div>

            {/* Term – choose any term (defaults to current) */}
            {pageData && pageData.allTerms.length > 0 && (
              <div>
                <label className="block ac-text-secondary text-sm font-medium mb-2">Term</label>
                <select
                  value={selectedTermKey || `${pageData.currentTerm.term}-${pageData.currentTerm.year}`}
                  onChange={(e) => {
                    setSelectedTermKey(e.target.value);
                    setSelectedExamSetId('');
                    setSelectedClass('');
                    setSelectedStudent('');
                  }}
                  className="ac-input w-full rounded-lg px-3 py-2 min-h-0"
                >
                  {pageData.allTerms.map((t) => {
                    const key = `${t.term}-${t.year}`;
                    const isCurrent =
                      t.term === pageData.currentTerm.term && t.year === pageData.currentTerm.year;
                    return (
                      <option key={key} value={key}>
                        Term {t.term}, {t.year}{isCurrent ? ' (Current)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-xs ac-text-muted">
                  Choose the term for which to generate reports.
                </p>
              </div>
            )}

            {/* Exam Set – choose specific exam set within the selected term */}
            {pageData && examSetsForSelectedTerm.length > 0 && (
              <div>
                <label className="block ac-text-secondary text-sm font-medium mb-2">Exam Set</label>
                <select
                  value={selectedExamSetId}
                  onChange={(e) => {
                    setSelectedExamSetId(e.target.value);
                    setSelectedClass('');
                    setSelectedStudent('');
                  }}
                  className="ac-input w-full rounded-lg px-3 py-2 min-h-0"
                >
                  <option value="">
                    Auto (latest exam set for selected term)
                  </option>
                  {examSetsForSelectedTerm.map((es: any) => (
                    <option key={es.id} value={es.id}>
                      {es.name || `Set - Term ${es.term}, ${es.year}`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs ac-text-muted">
                  Pick Mid Term or End of Term exam set. Leave on Auto to use the latest set (usually End of Term).
                </p>
              </div>
            )}
            {pageData && examSetsForSelectedTerm.length === 0 && selectedTerm && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                No exam set for Term {(selectedTerm || pageData.currentTerm).term}, {(selectedTerm || pageData.currentTerm).year}. Create a Mid Term or End of Term exam set for this term to generate reports.
              </div>
            )}

            {/* Class – only classes that have results for the selected exam set (so past terms show e.g. P7) */}
            <div>
              <label className="block ac-text-secondary text-sm font-medium mb-2">Class</label>
              {effectiveExamSetId ? (
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedStudent('');
                    setStudentSearch('');
                  }}
                  className="ac-input w-full rounded-lg px-3 py-2 min-h-0"
                >
                  <option value="">Select Class (Senior secondary only)</option>
                  {secondaryClassesForExamSet.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-[var(--ac-border)] ac-glass-card px-3 py-2 ac-text-muted text-sm">
                  Select Term and Exam Set first — then senior classes with results for that set will appear.
                </div>
              )}
              {effectiveExamSetId && secondaryClassesForExamSet.length === 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  No senior secondary (S1–S6) results for this exam set yet.
                </p>
              )}
            </div>

            {/* Report template — secondary layouts only */}
            <div className="min-w-0">
              <label className="mb-2 flex flex-wrap items-center gap-x-2 text-sm font-medium ac-text-secondary">
                <span>Report template</span>
                {selectedClass && (
                  <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                    Secondary layout
                  </span>
                )}
              </label>
              {!selectedClass ? (
                <div className="ac-input flex min-h-[42px] items-center rounded-lg px-3 py-2 text-sm ac-text-muted">
                  Select a class
                </div>
              ) : (
                <select
                  value={reportTemplateKey}
                  onChange={(e) => setReportTemplateKey(e.target.value)}
                  className="ac-input w-full min-h-0 rounded-lg px-3 py-2 text-sm"
                  title="Secondary report card layout (matches PDF)"
                >
                  {templateKeysForSelect.map((k) => (
                    <option key={k} value={k}>
                      {SECONDARY_TEMPLATES[k].name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Student – only when Single Student */}
          {reportType === 'single' && (
            <div className="mb-6">
              <label className="block ac-text-secondary text-sm font-medium mb-2">Student</label>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or admission number"
                className="ac-input w-full rounded-lg px-3 py-2 min-h-0 mb-2"
              />
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="ac-input w-full rounded-lg px-3 py-2 min-h-0"
              >
                <option value="">Select Student</option>
                {filteredStudents.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.name} {s.admission_number ? `(${s.admission_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {generationError && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              <p className="font-medium whitespace-pre-wrap">{generationError}</p>
              {generatingStep === 'error' ? (
                <>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    If it keeps failing: Vercel → Settings → Environment Variables (SUPABASE_URL, SUPABASE_ANON_KEY). For PDF
                    download, also set SUPABASE_SERVICE_ROLE_KEY; redeploy; or check Vercel → Deployments → Functions → Logs.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratingStep('idle');
                      setGenerationError('');
                      void handlePreviewReport();
                    }}
                    className="mt-2 text-sm font-semibold text-emerald-700 underline hover:no-underline dark:text-emerald-300"
                  >
                    Try again
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setGenerationError('')}
                  className="mt-2 text-sm font-semibold text-red-800 underline hover:no-underline dark:text-red-200"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {saveSuccess}
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {uploadSuccess}
            </div>
          )}

          {uploadingOnlineReview && uploadOnlineStatus ? (
            <div className="mb-4 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-900 dark:text-sky-100">
              {uploadOnlineStatus}
            </div>
          ) : null}

            <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePreviewReport}
              disabled={
                previewing ||
                !selectedClass ||
                (reportType === 'single' && !selectedStudent)
              }
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md shadow-emerald-900/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              {previewing ? 'Loading preview…' : 'Preview Report'}
            </button>
            <button
              type="button"
              onClick={handleGenerateAndSave}
              disabled={
                saving ||
                !selectedClass ||
                (reportType === 'single' && !selectedStudent)
              }
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md shadow-teal-900/20 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              {saving ? 'Saving…' : 'Generate & Save'}
            </button>
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
              title="Generate and save reports if needed, then download PDF"
              className="flex items-center gap-2.5 rounded-lg bg-[#EC1C24] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#EC1C24]/35 transition hover:bg-[#c91820] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC1C24] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
            >
              <AcrobatStylePdfIcon className="h-5 w-5 shrink-0 text-white" />
              Download PDF
            </button>
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
                title="Entire class only: build fresh PDFs from current data and download a ZIP (not the same as stored parent copies — use Download stored for those)."
                className="flex items-center gap-2 rounded-lg border border-[var(--ac-border)] bg-[var(--ac-glass-elevated)] px-4 py-3 text-sm font-semibold ac-text-primary transition hover:border-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloadingClassZip ? 'Building ZIP…' : 'Download Reports (ZIP)'}
              </button>
            ) : null}
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
                  ? 'Publish every student in this class for the parent portal (replaces stored PDFs for this exam).'
                  : 'Publish this student’s PDF for the parent portal (other students in the class are unchanged).'
              }
              className="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-500/20 dark:text-sky-200 dark:hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadingOnlineReview ? 'Uploading…' : 'Upload'}
            </button>
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
              title="Download files already published to storage for this exam (class ZIP if available, else one PDF per student in single mode)."
              className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-900 transition hover:bg-violet-500/20 dark:text-violet-200 dark:hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingPublished ? 'Preparing…' : 'Download stored'}
            </button>
          </div>
          {downloadPdfStatus && (
            <p className="mt-2 text-sm ac-text-secondary">{downloadPdfStatus}</p>
          )}
          {(classZipStatus || downloadPublishedStatus) && (
            <p className="mt-2 text-sm ac-text-secondary">
              {[classZipStatus, downloadPublishedStatus].filter(Boolean).join(' · ')}
            </p>
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
        </div>
    </AdminPageWrapper>
  );
}
