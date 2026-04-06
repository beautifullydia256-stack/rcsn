/**
 * Student Report Generator: Report Type, Term, Class, Student, Preview Report.
 */
import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { PRIMARY_TEMPLATES, getTemplateForClass } from '../../../templates/primary';
import { isPrePrimaryNurseryClass, countPrePrimaryStrandsWithData } from '../../../templates/primary/prePrimaryHolisticRatings';
import type { NurseryDetailedObservationRow } from '../../../templates/primary/prePrimaryDetailedCommentMapping';
import { getCurrentTerm } from '../../../lib/termStructure';
import { pdfDownloadFilenameFromResponse } from '../../../lib/pdfAttachmentFilename';
import { formatAverageWhole } from '../../../lib/reportUtils';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { ReportPreviewFromData } from '../../../components/reports/ReportPreviewFromData';
import { FileDown } from 'lucide-react';
import JSZip from 'jszip';

const STALE_TIME_MS = 5 * 60 * 1000;

/** Stable key for React Query + preview / PDF (must match edge payload). */
export function reportPreviewQueryKey(
  schoolId: string,
  term: number,
  year: number,
  examSetId: string,
  className: string,
  reportType: 'single' | 'class',
  studentIdForKey: string
) {
  return ['admin', 'report-preview', schoolId, term, year, examSetId, className, reportType, studentIdForKey] as const;
}

type PreviewInvokeBody = {
  schoolId: string;
  term: number;
  year: number;
  examSetId: string;
  className: string;
  studentId?: string;
};

async function invokeReportPreview(payload: PreviewInvokeBody): Promise<any[]> {
  const { data, error: fnError } = await supabase.functions.invoke('generate-report-preview', { body: payload });
  if (fnError) throw new Error(fnError.message || 'Preview failed');
  return (data?.reports ?? []) as any[];
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

export default function GenerateReportsPage() {
  const navigate = useNavigate();
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
  const [prePrimaryReportMode, setPrePrimaryReportMode] = useState<'colour' | 'detailed'>('colour');
  /** Selection used when we last generated; snapshot is only reused when current selection matches */
  const [lastGenerateFingerprint, setLastGenerateFingerprint] = useState<{
    term: number;
    year: number;
    examSetId: string;
    selectedClass: string;
    reportType: 'single' | 'class';
    selectedStudent: string;
  } | null>(null);

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
    queryClient.removeQueries({ queryKey: ['admin', 'report-preview'] });
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
      return previewReports.map((reportData) => ({ report_data: reportData }));
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
    if (!selectedClass) return 'Report For Baby Class';
    const key = getTemplateForClass(selectedClass);
    const t = PRIMARY_TEMPLATES[key as keyof typeof PRIMARY_TEMPLATES];
    return t?.name ?? 'Report For Baby Class';
  }, [selectedClass]);

  const isPrePrimaryClass = isPrePrimaryNurseryClass(selectedClass);

  const { data: nurseryObsRows } = useQuery({
    queryKey: ['nursery-detailed-observation-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('nursery_detailed_observation_items').select('*');
      if (error) throw error;
      return (data ?? []) as NurseryDetailedObservationRow[];
    },
    enabled: !!pageData?.schoolId && isPrePrimaryClass,
    staleTime: STALE_TIME_MS,
  });

  const detailedObservationItemsByKey = useMemo(() => {
    if (!nurseryObsRows?.length) return undefined;
    return Object.fromEntries(nurseryObsRows.map((r) => [r.item_key, r])) as Record<
      string,
      NurseryDetailedObservationRow
    >;
  }, [nurseryObsRows]);

  const prePrimaryStrandWarningCount = useMemo(() => {
    if (!isPrePrimaryClass || prePrimaryReportMode !== 'detailed' || previewReports.length === 0) return null;
    const raw = previewReports[0]?.students?.[0]?.results;
    const n = countPrePrimaryStrandsWithData((raw ?? []) as { subject?: string; nursery_skill_performance?: unknown }[]);
    return n < 5 ? n : null;
  }, [isPrePrimaryClass, prePrimaryReportMode, previewReports]);

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
    key: ReturnType<typeof reportPreviewQueryKey>;
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
    };
    const key = reportPreviewQueryKey(
      pageData.schoolId,
      term.term,
      term.year,
      examSet.id,
      selectedClass,
      reportType,
      reportType === 'single' ? selectedStudent : ''
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
      const { data, error: fnError } = await supabase.functions.invoke('generate-reports-final', { body: payload });
      if (fnError) throw new Error(fnError.message || 'Save failed');
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
        staleTime: STALE_TIME_MS,
      });
      setPreviewReports(reports);
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

      const reports = await queryClient.fetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: STALE_TIME_MS,
      });
      if (!reports.length) throw new Error('No reports to download');

      if (Array.isArray(cached) && cached.length > 0) {
        setDownloadPdfStatus('Preparing PDF…');
      }

      const response = await fetch(`${baseUrl}/api/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDataList: reports,
          schoolId: pageData.schoolId,
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
          typeof errBody?.error === 'string'
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
      title="Student Report Generator"
      subtitle="Generate and download student academic reports."
      headerActions={
        <>
          <button
            type="button"
            className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          >
            Customize Header
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports')}
            className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
          >
            Back to Reports
          </button>
        </>
      }
    >
      <div className={`${adminCardClass} rounded-xl border border-[var(--ac-border)]`}>
          <h2
            className="ac-text-primary mb-4 text-lg font-normal tracking-tight sm:text-xl"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Report Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Report Template – auto-selected, read-only display */}
            <div>
              <label className="block ac-text-secondary text-sm font-medium mb-2">
                Report Template
                <span className="ml-2 text-xs text-emerald-500 font-normal">✓ Auto-selected</span>
              </label>
              <div className="relative flex items-center rounded-lg border border-[var(--ac-border)] ac-glass-card px-3 py-2 ac-text-primary">
                <span>{templateDisplayName}</span>
                <span className="ml-2 text-emerald-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
              <p className="mt-1 text-xs ac-text-muted">
                Template automatically selected based on class section to ensure consistent formatting.
              </p>
            </div>

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
                  <option value="">Select Class</option>
                  {classesForExamSet.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-[var(--ac-border)] ac-glass-card px-3 py-2 ac-text-muted text-sm">
                  Select Term and Exam Set first — then classes with results for that set will appear.
                </div>
              )}
              {effectiveExamSetId && classesForExamSet.length === 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No results for this exam set yet.</p>
              )}
            </div>

            {isPrePrimaryClass && (
              <div>
                <label className="block ac-text-secondary text-sm font-medium mb-2">Pre-primary report layout</label>
                <select
                  value={prePrimaryReportMode}
                  onChange={(e) => setPrePrimaryReportMode(e.target.value as 'colour' | 'detailed')}
                  className="ac-input w-full rounded-lg px-3 py-2 min-h-0 max-w-md"
                >
                  <option value="colour">Colour checklist (holistic grid)</option>
                  <option value="detailed">Detailed comments (observation sentences)</option>
                </select>
                <p className="mt-1 text-xs ac-text-muted">
                  Detailed comments use the same ratings as exam entry. Enter all five learning-area subjects for a complete report.
                </p>
              </div>
            )}
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

          {generatingStep === 'error' && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              <p className="font-medium">{generationError}</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                If it keeps failing: Vercel → Settings → Environment Variables (SUPABASE_URL, SUPABASE_ANON_KEY). For PDF download, also set SUPABASE_SERVICE_ROLE_KEY; redeploy; or check Vercel → Deployments → Functions → Logs.
              </p>
              <button
                type="button"
                onClick={() => { setGeneratingStep('idle'); setGenerationError(''); void handlePreviewReport(); }}
                className="mt-2 text-sm font-semibold text-emerald-700 underline hover:no-underline dark:text-emerald-300"
              >
                Try again
              </button>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {saveSuccess}
            </div>
          )}

            <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePreviewReport}
              disabled={previewing || !selectedClass || (reportType === 'single' && !selectedStudent)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-md shadow-emerald-900/25 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              {previewing ? 'Loading preview…' : 'Preview Report'}
            </button>
            <button
              type="button"
              onClick={handleGenerateAndSave}
              disabled={saving || !selectedClass || (reportType === 'single' && !selectedStudent)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-md shadow-teal-900/20 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              {saving ? 'Saving…' : 'Generate & Save'}
            </button>
            <button
              type="button"
              onClick={handleDownloadSavedPdf}
              disabled={
                downloadingPdf ||
                saving ||
                !selectedClass ||
                (reportType === 'single' && !selectedStudent)
              }
              title="Generate and save reports if needed, then download PDF"
              className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/35 dark:text-emerald-200 dark:hover:bg-emerald-500/15"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
          {downloadPdfStatus && (
            <p className="mt-2 text-sm ac-text-secondary">{downloadPdfStatus}</p>
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
                  <span className="text-sm ac-text-secondary">Template: {templateDisplayName}</span>
                </div>
                <div className="ac-glass-card p-4 rounded-lg overflow-auto max-h-[80vh] border border-[var(--ac-border)]">
                  {prePrimaryStrandWarningCount != null && (
                    <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                      Only {prePrimaryStrandWarningCount} of 5 learning areas have ratings for this exam set. Missing areas
                      will show &quot;Not recorded for this assessment.&quot; Add ratings under each strand subject in Exam
                      Results for a complete report.
                    </div>
                  )}
                  <div
                    className="report-preview-doc-surface mx-auto space-y-8 rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-sm print:border-0 print:bg-white print:shadow-none"
                    style={{ width: '210mm', maxWidth: '100%' }}
                  >
                    {reportsToDisplay.map((report: any, idx: number) => (
                      <div key={report.id || report.report_data?.students?.[0]?.student_id || idx} className="report-student-card">
                        <ReportPreviewFromData
                          reportData={report.report_data}
                          prePrimaryReportMode={prePrimaryReportMode}
                          detailedObservationItemsByKey={detailedObservationItemsByKey}
                        />
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
