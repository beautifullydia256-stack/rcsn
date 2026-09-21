/**
 * Student Report Generator: Report Type, Term, Class, Student, Preview Report.
 */
import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
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
  Award,
} from 'lucide-react';
import {
  PRIMARY_TEMPLATES,
  getTemplateForClass,
  getSectionForClass,
} from '../../../templates/primary';
import {
  SECONDARY_TEMPLATES,
  getDefaultSecondaryTemplateKey,
  getSecondaryTemplateKeysForClass,
  type SecondaryTemplateKey,
} from '../../../templates/secondary';
import { isALevelClass, isOLevelClass } from '../../../components/reports/templates/helpers';
import {
  isPrePrimaryNurseryClass,
  countPrePrimaryStrandsWithData,
  normalizePrePrimaryHolisticGrade,
  type PrePrimaryHolisticGradeEnum,
} from '../../../templates/primary/prePrimaryHolisticRatings';
import { fetchPrePrimaryHolisticConfig, runtimeStrandsToHolisticStrands } from '../../../lib/prePrimaryHolisticDb';
import { getCurrentTerm } from '../../../lib/termStructure';
import { resolveCurrentSchoolTerm } from '../../../lib/adminFinanceTerm';
import { fetchAllGeneratedReportsForSnapshot } from '../../../lib/fetchAllReportSnapshotDataPaged';
import { isDesktopApp } from '../../../lib/isDesktopApp';
import { isElectronDesktop } from '../../../lib/desktopPdf';
import { getFunctionInvokeErrorDetail } from '../../../lib/supabaseFunctionInvokeError';
import { formatAverageWhole } from '../../../lib/reportUtils';
import { GlassModal } from '../../../components/Glass/GlassModal';
import { ReportPreviewFromData } from '../../../components/reports/ReportPreviewFromData';
import { StudentSelectCombobox } from '../../../components/reports/StudentSelectCombobox';
import { formatSupabaseError, hintForPublishedReportRpc } from '../../../lib/supabaseError';
import {
  mergeDefaultHolisticTeacherRemarksIntoMap,
  prePrimaryTeacherRemarkStorageKey,
} from '../../../templates/primary/prePrimaryHolisticRemarkLookup';
import { ensureClassIdForPublish } from '../../../lib/classIdLookup';
import { buildSingleStudentReportPdfFilename } from '../../../lib/reportPdfFilenames';
import {
  adminReportPdfBlobsFromPreviewPrimary,
  adminReportPdfBlobsFromPreviewSecondary,
  primaryGeneratePdfFromReports,
  secondaryGeneratePdfFromReports,
} from '../../../lib/adminReportPdfFromPreview';
import { ProgressBar } from '../../../components/reports/ProgressBar';
import {
  buildPublishedClassBundleStoragePath,
  buildPublishedStudentReportStoragePath,
  getStudentIdFromPreviewReportData,
} from '../../../lib/publishedReportPaths';
import { saveBlobAsDownload, storageDownloadBlob } from '../../../lib/downloadBlob';
import {
  lookupCachedPdfs,
  saveToPdfCache,
  getSignedCacheUrl,
  downloadCachedBlob,
} from '../../../lib/reportPdfCache';
import JSZip from 'jszip';

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
export function reportPreviewQueryKey(
  schoolId: string,
  term: number,
  year: number,
  examSetId: string,
  className: string,
  reportType: 'single' | 'class',
  studentIdForKey: string,
  largeClassPreview = false
) {
  return ['admin', 'report-preview', schoolId, term, year, examSetId, className, reportType, studentIdForKey, largeClassPreview] as const;
}

type PreviewInvokeBody = {
  schoolId: string;
  term: number;
  year: number;
  examSetId: string;
  className: string;
  studentId?: string;
  /** True when no specific exam set is chosen — Edge Function fetches all term sets so Mid + End of Term columns both appear. */
  isAutoMode?: boolean;
  /** Electron desktop: request higher preview cap (Edge Function). */
  largeClassPreview?: boolean;
};

async function invokeReportPreview(payload: PreviewInvokeBody): Promise<any[]> {
  const { data, error: fnError } = await supabase.functions.invoke('generate-report-preview', { body: payload });
  if (fnError) throw new Error(await getFunctionInvokeErrorDetail(fnError));
  return (data?.reports ?? []) as any[];
}

async function fetchGeneratedReports(snapshotId: string) {
  const rows = await fetchAllGeneratedReportsForSnapshot(supabase, snapshotId);
  return rows.sort((a, b) =>
    String((b as { generated_at?: string }).generated_at ?? '').localeCompare(
      String((a as { generated_at?: string }).generated_at ?? '')
    )
  );
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

export default function GenerateReportsPage() {
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
  /** Incremented every time selection changes; background cache jobs check this to self-cancel. */
  const bgCacheGenRef = useRef(0);
  /** Always points to the latest handlePreviewReport so the auto-trigger useEffect never has a stale closure. */
  const handlePreviewRef = useRef<(() => Promise<void>) | null>(null);
  const [bgCaching, setBgCaching] = useState(false);
  // Progress tracking for generation and upload
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [progressPhase, setProgressPhase] = useState<'generating' | 'uploading' | 'completed'>('generating');
  /**
   * Report layout (template1–template6). Synced from class mapping.
   * Only Baby Class (section) may choose the heritage layout (template6); all other classes are fixed.
   */
  const [reportTemplateKey, setReportTemplateKey] = useState<string>('template1');
  /** Nursery format: 'old' (marks-based) or 'latest' (colored performance) */
  const [nurseryFormat, setNurseryFormat] = useState<'old' | 'latest'>('latest');
  /** Preserve secondary template1–3 when switching between senior classes (same as historical generator). */
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
    // Cancel any running background PDF cache generation.
    bgCacheGenRef.current += 1;
    setBgCaching(false);
  }, [selectedTermKey, selectedExamSetId, selectedClass, reportType, selectedStudent, queryClient]);

  // Auto-trigger preview for single-student reports once class + student + exam set are selected.
  // Class mode is intentionally excluded — fetching an entire class can take minutes and should
  // only start when the user explicitly clicks "Preview Report".
  // Does NOT retry on error — user must click Preview manually after an error.
  useEffect(() => {
    if (!pageData?.schoolId || !selectedClass || !effectiveExamSetId) return;
    if (reportType !== 'single' || !selectedStudent) return;
    if (previewing || previewReports.length > 0) return;
    if (generatingStep === 'error') return;
    const timer = setTimeout(() => {
      if (handlePreviewRef.current) void handlePreviewRef.current();
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageData?.schoolId, selectedClass, effectiveExamSetId, reportType, selectedStudent, previewing, previewReports.length, generatingStep]);

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

  const recommendedTemplateKey = useMemo(
    () => (selectedClass ? getTemplateForClass(selectedClass) : ''),
    [selectedClass]
  );

  const selectedSection = useMemo(
    () => (selectedClass ? getSectionForClass(selectedClass) : null),
    [selectedClass]
  );

  /** Same rule as Next.js PrimaryReportGenerator: only Baby Class may pick heritage vs classic nursery layout. */
  const isBabyClassTemplateChoice = selectedSection === 'Baby Class';

  const isSecondaryLayoutChoice = useMemo(
    () => !!selectedClass && (isOLevelClass(selectedClass) || isALevelClass(selectedClass)),
    [selectedClass]
  );

  const templateDisplayName = useMemo(() => {
    if (!selectedClass) return '';
    if (isSecondaryLayoutChoice) {
      const st =
        SECONDARY_TEMPLATES[reportTemplateKey as keyof typeof SECONDARY_TEMPLATES] ??
        SECONDARY_TEMPLATES.template1;
      return st.name;
    }
    const t = PRIMARY_TEMPLATES[reportTemplateKey as keyof typeof PRIMARY_TEMPLATES];
    return t?.name ?? '';
  }, [selectedClass, reportTemplateKey, isSecondaryLayoutChoice]);

  useEffect(() => {
    if (!selectedClass) return;
    const autoPrimary = getTemplateForClass(selectedClass);
    const autoSecondary = getDefaultSecondaryTemplateKey(selectedClass);
    const prevClass = prevClassForTemplateRef.current;
    const wasSecondary = !!prevClass && (isOLevelClass(prevClass) || isALevelClass(prevClass));
    const isSecondary = isOLevelClass(selectedClass) || isALevelClass(selectedClass);
    const secondaryKeys = new Set(['template1', 'template2', 'template3', 'template4']);

    if (isBabyClassTemplateChoice) {
      setReportTemplateKey((prev) => {
        if (prev === 'template2') return 'template6';
        if (prev === 'template6') return prev;
        return autoPrimary;
      });
    } else if (isSecondary) {
      setReportTemplateKey((prev) => {
        const keep = wasSecondary && secondaryKeys.has(prev);
        if (keep) return prev;
        return autoSecondary;
      });
    } else {
      setReportTemplateKey(autoPrimary);
    }

    prevClassForTemplateRef.current = selectedClass;
  }, [selectedClass, isBabyClassTemplateChoice]);

  useEffect(() => {
    if (!selectedClass) return;
    if (!isOLevelClass(selectedClass) && !isALevelClass(selectedClass)) return;
    const allowed = getSecondaryTemplateKeysForClass(selectedClass);
    setReportTemplateKey((prev) =>
      allowed.includes(prev as SecondaryTemplateKey) ? prev : allowed[0]
    );
  }, [selectedClass]);

  const isPrePrimaryClass = isPrePrimaryNurseryClass(selectedClass);

  const { data: prePrimaryHolisticRuntimeConfig } = useQuery({
    queryKey: ['pre-primary-holistic-config', pageData?.schoolId ?? ''],
    queryFn: async () => {
      if (!pageData?.schoolId) return null;
      return fetchPrePrimaryHolisticConfig(supabase, pageData.schoolId);
    },
    enabled: !!pageData?.schoolId && isPrePrimaryClass,
    staleTime: STALE_TIME_MS,
  });

  const { data: teacherSkillRemarkRows = [] } = useQuery({
    queryKey: ['teacher-skill-remarks-for-report-grid', pageData?.schoolId ?? ''],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_remarks_settings')
        .select('subject, skill_key, holistic_grade_enum, comment_text')
        .eq('school_id', pageData!.schoolId)
        .not('holistic_grade_enum', 'is', null)
        .not('skill_key', 'is', null);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!pageData?.schoolId && isPrePrimaryClass,
    staleTime: STALE_TIME_MS,
  });

  const teacherSkillRemarksByStrandSkill = useMemo(() => {
    const levels = prePrimaryHolisticRuntimeConfig?.ratingLevels ?? null;
    const out: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>> = {};
    for (const raw of teacherSkillRemarkRows) {
      const r = raw as {
        subject?: string | null;
        skill_key?: string | null;
        holistic_grade_enum?: string | null;
        comment_text?: string | null;
      };
      const subj = String(r.subject || '').trim();
      const sk = String(r.skill_key || '').trim();
      const g = normalizePrePrimaryHolisticGrade(r.holistic_grade_enum, levels);
      if (!subj || !sk || !g) continue;
      const text = String(r.comment_text || '');
      const stableKey = prePrimaryTeacherRemarkStorageKey(subj, sk);
      const legacyKey = `${subj}::${sk}`;
      for (const key of new Set([stableKey, legacyKey])) {
        if (!out[key]) out[key] = {};
        out[key][g] = text;
      }
    }
    mergeDefaultHolisticTeacherRemarksIntoMap(out, prePrimaryHolisticRuntimeConfig ?? null);
    return Object.keys(out).length > 0 ? out : null;
  }, [teacherSkillRemarkRows, prePrimaryHolisticRuntimeConfig]);

  const prePrimaryStrandWarningCount = useMemo(() => {
    if (!isPrePrimaryClass || previewReports.length === 0) return null;
    const raw = previewReports[0]?.students?.[0]?.results;
    const strands = prePrimaryHolisticRuntimeConfig
      ? runtimeStrandsToHolisticStrands(prePrimaryHolisticRuntimeConfig.strands)
      : undefined;
    const n = countPrePrimaryStrandsWithData(
      (raw ?? []) as { subject?: string; nursery_skill_performance?: unknown }[],
      strands,
      prePrimaryHolisticRuntimeConfig?.ratingLevels ?? null
    );
    return n < 5 ? n : null;
  }, [isPrePrimaryClass, previewReports, prePrimaryHolisticRuntimeConfig]);

  const { data: classesForExamSet = [] } = useQuery({
    queryKey: ['admin', 'classes-for-exam-set', pageData?.schoolId ?? '', effectiveExamSetId ?? ''],
    queryFn: () => fetchClassesForExamSet(pageData!.schoolId, effectiveExamSetId!),
    enabled: !!pageData?.schoolId && !!effectiveExamSetId,
    staleTime: STALE_TIME_MS,
  });

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
      isAutoMode: !selectedExamSetId,
      className: selectedClass,
      ...(reportType === 'single' && selectedStudent ? { studentId: selectedStudent } : {}),
      ...(isDesktopApp ? { largeClassPreview: true } : {}),
    };
    const key = reportPreviewQueryKey(
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
      // Positions, aggregates, and divisions are computed in-memory by the Edge Function
      // from raw exam_results — no pre-processing RPC needed.
      const payload = {
        schoolId: pageData.schoolId,
        term: term.term,
        year: term.year,
        examSetId: examSet.id,
        isAutoMode: !selectedExamSetId,
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
      // Load preview — positions and aggregates computed in-memory from raw marks (no RPC needed)
      const reports = await queryClient.fetchQuery({
        queryKey: ctx.key,
        queryFn: () => invokeReportPreview(ctx.payload),
        staleTime: STALE_TIME_MS,
      });
      setPreviewReports(reports);
      setGeneratingStep('completed');

      // Background: generate PDFs for all previewed students and store in cache.
      // By the time the admin finishes reviewing and clicks Download, the PDFs
      // are already in Storage — download becomes an instant signed-URL fetch.
      if (!isDesktopApp && reports.length > 0) {
        const examSetForCache = getEffectiveExamSet();
        const termForCache = selectedTerm || pageData.currentTerm;
        if (examSetForCache && termForCache) {
          const myGen = ++bgCacheGenRef.current;
          setBgCaching(true);
          void (async () => {
            try {
              const reportsForCache = reports.map((r: Record<string, unknown>) => {
                if (!isPrePrimaryNurseryClass(selectedClass)) return r;
                return {
                  ...r,
                  prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
                  prePrimaryReportMode: 'colour' as const,
                  teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
                };
              });
              const blobs = isSecondaryLayoutChoice
                ? await adminReportPdfBlobsFromPreviewSecondary(reportsForCache, {
                    reportTemplateKey,
                    reportType: reportType === 'single' ? 'single' : 'class',
                    selectedStudent: reportType === 'single' ? selectedStudent : '',
                    onStatus: () => {},
                  })
                : await adminReportPdfBlobsFromPreviewPrimary(reportsForCache, {
                    supabase,
                    schoolId: pageData!.schoolId,
                    selectedClass,
                    reportTemplateKey,
                    isSecondaryLayoutChoice,
                    prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
                    teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
                    reportType: reportType === 'single' ? 'single' : 'class',
                    selectedStudent: reportType === 'single' ? selectedStudent : '',
                    onStatus: () => {},
                  });
              if (bgCacheGenRef.current !== myGen) return;
              await Promise.all(
                blobs.map(({ blob, reportData }) => {
                  const sid = getStudentIdFromPreviewReportData(reportData as Record<string, unknown>);
                  if (!sid) return Promise.resolve();
                  return saveToPdfCache(
                    pageData!.schoolId, sid, selectedClass,
                    termForCache.term, termForCache.year,
                    examSetForCache.id, reportTemplateKey, blob,
                  );
                })
              );
            } catch {
              // Background failure is silent — download falls back to on-demand generation.
            } finally {
              if (bgCacheGenRef.current === myGen) setBgCaching(false);
            }
          })();
        }
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to load preview');
      setGeneratingStep('error');
      setPreviewReports([]);
    } finally {
      setPreviewing(false);
    }
  };
  // Keep ref current on every render so auto-trigger always calls the latest version.
  handlePreviewRef.current = handlePreviewReport;

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

      // ── Cache-first: serve from Storage if PDF is already generated ──
      const term = selectedTerm || pageData.currentTerm;
      const examSet = getEffectiveExamSet();
      if (examSet && reportType === 'single' && selectedStudent) {
        setDownloadPdfStatus('Checking cache…');
        const cacheMap = await lookupCachedPdfs(
          pageData.schoolId, selectedClass, term.term, term.year, examSet.id, reportTemplateKey,
        );
        const cachedPath = cacheMap.get(selectedStudent);
        if (cachedPath) {
          const signedUrl = await getSignedCacheUrl(cachedPath);
          if (signedUrl) {
            setDownloadPdfStatus('Downloading…');
            try {
              // Fetch blob from the signed URL so we control the filename and avoid
              // showing the Supabase Storage URL in the browser (cross-origin anchors
              // ignore the download attribute and navigate instead of saving).
              const resp = await fetch(signedUrl);
              if (resp.ok) {
                const blob = await resp.blob();
                const rdForName = (previewReports.find((r) =>
                  getStudentIdFromPreviewReportData(r as Record<string, unknown>) === selectedStudent
                ) ?? previewReports[0]) as Record<string, unknown> | undefined;
                const fname = rdForName
                  ? buildSingleStudentReportPdfFilename(rdForName)
                  : `report_${selectedStudent}.pdf`;
                const objectUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = fname;
                a.click();
                window.URL.revokeObjectURL(objectUrl);
                setDownloadPdfStatus('Download started.');
                setTimeout(() => setDownloadPdfStatus(''), 1500);
                return;
              }
            } catch {
              // signed URL unreachable — fall through to fresh generation below
            }
          }
        }
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

      const enrichPrimaryNurseryForPdf = (rd: Record<string, unknown>): Record<string, unknown> => {
        if (!isPrePrimaryNurseryClass(selectedClass)) return rd;
        return {
          ...rd,
          prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
          prePrimaryReportMode: 'colour' as const,
          teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
        };
      };
      const reportsForPdf = reports.map((r) => enrichPrimaryNurseryForPdf(r as Record<string, unknown>));

      if (Array.isArray(cached) && cached.length > 0) {
        setDownloadPdfStatus('Preparing PDF…');
      }

      const onPdfStatus = (msg: string) => setDownloadPdfStatus(msg);
      const { blob, filename } = isSecondaryLayoutChoice
        ? await secondaryGeneratePdfFromReports(reportsForPdf, {
            reportTemplateKey,
            reportType,
            selectedStudent,
            onStatus: onPdfStatus,
          })
        : await primaryGeneratePdfFromReports(reportsForPdf, {
            supabase,
            schoolId: pageData.schoolId,
            selectedClass,
            reportTemplateKey,
            isSecondaryLayoutChoice,
            prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
            teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
            reportType,
            selectedStudent,
            onStatus: onPdfStatus,
          });

      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      setDownloadPdfStatus('Download started.');
      setTimeout(() => setDownloadPdfStatus(''), 1500);

      // Save to cache so next download is instant.
      const examSetNow = getEffectiveExamSet();
      const termNow = selectedTerm || pageData.currentTerm;
      if (examSetNow && reportType === 'single' && selectedStudent) {
        void saveToPdfCache(
          pageData.schoolId, selectedStudent, selectedClass,
          termNow.term, termNow.year, examSetNow.id, reportTemplateKey, blob,
        );
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to download PDF');
      setGeneratingStep('error');
      setDownloadPdfStatus('');
    } finally {
      setDownloadingPdf(false);
    }
  };

  /** Fresh preview, one PDF per student, ZIP in browser (class mode only; admin / school use). */
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

      // ── Cache-first: download already-generated PDFs from Storage ──
      setClassZipStatus('Checking cache…');
      const cacheMap = await lookupCachedPdfs(
        pageData.schoolId, selectedClass, term.term, term.year, examSet.id, reportTemplateKey,
      );

      const zip = new JSZip();
      const reportsNeedingGeneration: typeof reports = [];

      // Download cached blobs in parallel
      const cachedDownloads = await Promise.all(
        reports.map(async (rd) => {
          const sid = getStudentIdFromPreviewReportData(rd as Record<string, unknown>);
          if (!sid) return null;
          const path = cacheMap.get(sid);
          if (!path) return null;
          const blob = await downloadCachedBlob(path);
          return blob ? { sid, blob } : null;
        })
      );

      let cachedCount = 0;
      for (let i = 0; i < reports.length; i++) {
        const hit = cachedDownloads[i];
        if (hit) {
          const sid = hit.sid;
          // Build filename same as the generator would
          const st = (reports[i] as any)?.students?.[0];
          const studentName = String(st?.name ?? sid);
          const safeName = studentName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60);
          zip.file(`${safeName}_${selectedClass}_T${term.term}_${term.year}.pdf`, hit.blob);
          cachedCount++;
        } else {
          reportsNeedingGeneration.push(reports[i]);
        }
      }

      // Generate remaining (cache miss) PDFs via Puppeteer
      if (reportsNeedingGeneration.length > 0) {
        setClassZipStatus(
          cachedCount > 0
            ? `Generating ${reportsNeedingGeneration.length} new report(s)…`
            : 'Generating reports…',
        );
        const onZipStatus = (msg: string) => setClassZipStatus(msg);
        const enriched = reportsNeedingGeneration.map((r: Record<string, unknown>) => {
          if (!isPrePrimaryNurseryClass(selectedClass)) return r;
          return {
            ...r,
            prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
            prePrimaryReportMode: 'colour' as const,
            teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
          };
        });
        const primaryCtx = {
          supabase,
          schoolId: pageData.schoolId,
          selectedClass,
          reportTemplateKey,
          isSecondaryLayoutChoice,
          prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
          teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
          reportType: 'class' as const,
          selectedStudent: '',
          onStatus: onZipStatus,
        };
        const newBlobs = isSecondaryLayoutChoice
          ? await adminReportPdfBlobsFromPreviewSecondary(enriched, {
              reportTemplateKey,
              reportType: 'class',
              selectedStudent: '',
              onStatus: onZipStatus,
            })
          : await adminReportPdfBlobsFromPreviewPrimary(enriched, primaryCtx);

        for (const { filename, blob, reportData } of newBlobs) {
          zip.file(filename, blob);
          // Save newly generated PDFs to cache for next time.
          const sid = getStudentIdFromPreviewReportData(reportData as Record<string, unknown>);
          if (sid) {
            void saveToPdfCache(
              pageData.schoolId, sid, selectedClass,
              term.term, term.year, examSet.id, reportTemplateKey, blob,
            );
          }
        }
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

  /** Regenerate PDFs, upload to Storage, replace or patch `published_*` for scope. Class = full replace + ZIP; single = patch one student only. */
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
    setProgressPhase('uploading');
    setUploadProgress({ current: 0, total: 0 });
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

      // ── Cache-first: reuse pre-generated blobs from Storage ──
      setUploadOnlineStatus('Checking pre-generated PDFs…');
      const uploadCacheMap = await lookupCachedPdfs(
        pageData.schoolId, selectedClass, term.term, term.year, examSet.id, reportTemplateKey,
      );
      const reportsNeedingPdf: typeof reports = [];
      const cachedBlobResults: Array<{ blob: Blob; filename: string; reportData: Record<string, unknown> } | null> =
        await Promise.all(
          reports.map(async (rd) => {
            const sid = getStudentIdFromPreviewReportData(rd as Record<string, unknown>);
            if (!sid) return null;
            const path = uploadCacheMap.get(sid);
            if (!path) { reportsNeedingPdf.push(rd); return null; }
            const blob = await downloadCachedBlob(path);
            if (!blob) { reportsNeedingPdf.push(rd); return null; }
            const st = (rd as any)?.students?.[0];
            const studentName = String(st?.name ?? sid);
            const safeName = studentName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60);
            return { blob, filename: `${safeName}_${selectedClass}_T${term.term}_${term.year}.pdf`, reportData: rd as Record<string, unknown> };
          })
        );

      // Generate remaining via Puppeteer (cache misses only)
      let freshBlobs: Array<{ blob: Blob; filename: string; reportData: Record<string, unknown> }> = [];
      if (reportsNeedingPdf.length > 0) {
        setUploadOnlineStatus(`Generating ${reportsNeedingPdf.length} PDF(s)…`);
        const enrichedForUpload = reportsNeedingPdf.map((r: Record<string, unknown>) => {
          if (!isPrePrimaryNurseryClass(selectedClass)) return r;
          return {
            ...r,
            prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
            prePrimaryReportMode: 'colour' as const,
            teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
          };
        });
        const primaryCtx = {
          supabase,
          schoolId: pageData.schoolId,
          selectedClass,
          reportTemplateKey,
          isSecondaryLayoutChoice,
          prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
          teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
          reportType: pdfReportType,
          selectedStudent: pdfStudentId,
          onStatus: onUp,
        };
        freshBlobs = isSecondaryLayoutChoice
          ? await adminReportPdfBlobsFromPreviewSecondary(enrichedForUpload, {
              reportTemplateKey,
              reportType: pdfReportType,
              selectedStudent: pdfStudentId,
              onStatus: onUp,
            })
          : await adminReportPdfBlobsFromPreviewPrimary(enrichedForUpload, primaryCtx);
        // Save fresh PDFs to cache for future instant downloads.
        void Promise.all(
          freshBlobs.map(({ blob, reportData }) => {
            const sid = getStudentIdFromPreviewReportData(reportData);
            if (!sid) return Promise.resolve();
            return saveToPdfCache(
              pageData.schoolId, sid, selectedClass,
              term.term, term.year, examSet.id, reportTemplateKey, blob,
            );
          })
        );
      }

      const blobs = [
        ...cachedBlobResults.filter((b): b is NonNullable<typeof b> => b !== null),
        ...freshBlobs,
      ];

      const studentRows: { student_id: string; storage_object_path: string }[] = [];
      setUploadOnlineStatus('Uploading student PDFs…');
      setUploadProgress({ current: 0, total: blobs.length });
      
      for (let idx = 0; idx < blobs.length; idx++) {
        const item = blobs[idx];
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
          setUploadProgress({ current: idx + 1, total: blobs.length });
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
      setProgressPhase('completed');
      setUploadProgress({ current: blobs.length, total: blobs.length });
      setUploadSuccess(
        'Upload saved. Parents can open the portal; staff can use Report Records (History) or Download stored with the same Term, Exam set, Class, and Student.',
      );
      setTimeout(() => {
        setUploadSuccess('');
        setProgressPhase('generating');
        setUploadProgress({ current: 0, total: 0 });
      }, 12000);
    } catch (err: unknown) {
      const hint = hintForPublishedReportRpc(err);
      setGenerationError(
        hint ? `${formatSupabaseError(err)}\n\nWhat to fix: ${hint}` : formatSupabaseError(err),
      );
      setUploadOnlineStatus('');
      setProgressPhase('generating');
    } finally {
      setUploadingOnlineReview(false);
    }
  };

  /** Download already-published files from storage (class → ZIP, single → one PDF). No preview regen. */
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
            <span>Academic Performance & Report Cards</span>
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
            Student Report Generator
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: textMuted }}>
            Generate, inspect, and bulk publish ministry-compliant academic term report cards.
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
              Class Enrollment
            </span>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: isDark ? 'rgba(192,132,252,0.1)' : 'rgba(126,34,206,0.08)', color: isDark ? '#c084fc' : '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <School size={14} />
            </div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 18, fontWeight: 800, color: textColor }}>
            {selectedClass ? `${studentsInClass.length} Students` : 'Select Class'}
          </div>
          <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
            {selectedClass ? `Roster for ${selectedClass}` : 'Classes with exam entries'}
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
              ? (selectedStudent ? 'Pupil profile selected' : 'Awaiting pupil pick')
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
                Inspect and generate a dedicated academic report card for one student.
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
                Bulk produce, archive, and download merged PDFs or ZIP files for all pupils in stream.
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
              Report Parameters & Assessment Controls
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: textMuted }}>
              Specify the academic period, exam set, and class to generate accurate grades and rankings.
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
              <span>Class Stream</span>
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
                <option value="">Select Class Roster</option>
                {classesForExamSet.map((c) => (
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
            {effectiveExamSetId && classesForExamSet.length === 0 ? (
              <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, margin: '4px 0 0 0' }}>
                No exam marks recorded for this set yet
              </p>
            ) : (
              <p style={{ fontSize: 11, color: textMuted, marginTop: 4, margin: '4px 0 0 0' }}>
                {classesForExamSet.length} classes available
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
            ) : isPrePrimaryClass ? (
              <select
                value={nurseryFormat}
                onChange={(e) => setNurseryFormat(e.target.value as 'old' | 'latest')}
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
                <option value="old">Old Format (Marks-based, Primary layout)</option>
                <option value="latest">Latest Format (Colored Holistic Performance)</option>
              </select>
            ) : isBabyClassTemplateChoice ? (
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
                <option value="template6">{PRIMARY_TEMPLATES.template6.name} (Heritage)</option>
              </select>
            ) : isSecondaryLayoutChoice ? (
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
                {getSecondaryTemplateKeysForClass(selectedClass).map((k) => (
                  <option key={k} value={k}>
                    {SECONDARY_TEMPLATES[k].name}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  height: 42,
                  borderRadius: 10,
                  border: inputBorder,
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                  color: textColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {templateDisplayName ||
                    PRIMARY_TEMPLATES[recommendedTemplateKey as keyof typeof PRIMARY_TEMPLATES]?.name}
                </span>
                <CheckCircle2 size={16} style={{ color: isDark ? '#3de8a0' : '#059669', flexShrink: 0 }} />
              </div>
            )}
            <p style={{ fontSize: 11, color: textMuted, marginTop: 4, margin: '4px 0 0 0' }}>
              Ministry curriculum structure
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

        <ProgressBar
          phase={progressPhase}
          current={uploadProgress.current}
          total={uploadProgress.total}
          isVisible={uploadingOnlineReview && uploadProgress.total > 0}
        />

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
            <span>{saving ? 'Saving…' : 'Save to Archive'}</span>
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
            <span>{uploadingOnlineReview ? 'Uploading…' : 'Upload to Portal'}</span>
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
            Report Card Staging Ready
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
            Select the academic term, assessment set, class, and pupil above, then click{' '}
            <strong style={{ color: isDark ? '#3de8a0' : '#059669' }}>Preview Report</strong> to inspect
            subject scores, aggregates, divisions, and teacher remarks before printing or publishing.
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
              <span>Official UNEB & Ministry Standards</span>
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
              <span>Automatic Division & Aggregates</span>
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
                  {templateDisplayName && (
                    <span className="text-sm ac-text-secondary">Template: {templateDisplayName}</span>
                  )}
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
                    id="report-preview-doc-surface"
                    className="report-preview-doc-surface mx-auto space-y-8 rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-sm print:border-0 print:bg-white print:shadow-none"
                    style={{ width: '210mm', maxWidth: '100%' }}
                  >
                    {reportsToDisplay.map((report: any, idx: number) => {
                      // Override nursery format based on user selection
                      const reportDataWithFormat = isPrePrimaryClass && report.report_data
                        ? {
                            ...report.report_data,
                            students: report.report_data.students?.map((s: any) => ({
                              ...s,
                              nursery_report_format: nurseryFormat,
                              results: s.results?.map((r: any) => ({
                                ...r,
                                nursery_report_format: nurseryFormat,
                              })),
                            })),
                          }
                        : report.report_data;
                      
                      return (
                        <div key={report.id || report.report_data?.students?.[0]?.student_id || idx} className="report-student-card">
                          <ReportPreviewFromData
                            reportData={reportDataWithFormat}
                            templateKey={reportTemplateKey}
                            prePrimaryReportMode="colour"
                            prePrimaryHolisticRuntimeConfig={prePrimaryHolisticRuntimeConfig ?? null}
                            teacherSkillRemarksByStrandSkill={teacherSkillRemarksByStrandSkill}
                          />
                        </div>
                      );
                    })}
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
