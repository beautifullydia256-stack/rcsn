import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { triggerBlobDownload, storageDownloadBlob, mobileOptimizedDownload } from '../../../lib/downloadBlob';
import {
  buildPublishedClassBundleZipDownloadFilename,
  buildSingleStudentReportPdfFilename,
} from '../../../lib/reportPdfFilenames';
import { useSchoolType } from '../../../hooks/useSchoolType';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import { ArrowLeft, Download, RefreshCw, Archive, Search } from 'lucide-react';
import '@/styles/government-system.css';

const STALE_TIME_MS = 5 * 60 * 1000;

export type StudentPdfRecord = {
  id: string;
  date: string;
  student_id: string;
  student: string;
  template: string;
  storage_bucket: string;
  file: string;
  term: number;
  year: number;
  exam_set_id: string;
  exam: string;
  class: string;
  school_id: string;
};

export type ClassBundleRow = {
  id: string;
  class_id: string;
  class_name: string;
  term: number;
  year: number;
  exam_set_id: string;
  exam_name: string;
  published_at: string;
  storage_object_path: string;
  storage_bucket: string;
};

const buildStudentPdfQuery = ({
  supabase,
  schoolId,
  term,
  year,
  examSetId,
  className,
}: {
  supabase: any;
  schoolId: string;
  term?: number | null;
  year?: number | null;
  examSetId?: string | null;
  className?: string | null;
}) => {
  let query = supabase
    .from('student_pdf_records')
    .select('*')
    .eq('school_id', schoolId)
    .order('date', { ascending: false });

  if (term != null) query = query.eq('term', term);
  if (year != null) query = query.eq('year', year);
  if (examSetId) query = query.eq('exam_set_id', examSetId);
  if (className) query = query.eq('class', className);

  // Safe boundary to prevent database statement timeout on unfiltered scans
  if (term == null && year == null && !examSetId && !className) {
    query = query.limit(150);
  }

  return query;
};

export async function fetchStudentPdfRecords(userId: string): Promise<StudentPdfRecord[]> {
  const { data: u, error: uErr } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (uErr || !u?.school_id) return [];

  const schoolId = u.school_id;

  const { data, error } = await buildStudentPdfQuery({
    supabase,
    schoolId,
  });

  if (error) {
    console.error('student_pdf_records query error:', error);
    return [];
  }

  return data || [];
}

async function fetchSchoolIdForUser(userId: string): Promise<string | null> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  return u?.school_id ?? null;
}

export async function fetchClassReportBundles(userId: string): Promise<ClassBundleRow[]> {
  const schoolId = await fetchSchoolIdForUser(userId);
  if (!schoolId) return [];

  const { data, error } = await supabase
    .from('published_class_report_bundles')
    .select(
      'id, class_id, term, year, exam_set_id, published_at, storage_object_path, storage_bucket, classes(class_name), exam_sets(name)'
    )
    .eq('school_id', schoolId)
    .order('published_at', { ascending: false });

  if (error || !data?.length) return [];

  return (data as {
    id: string;
    class_id: string;
    term: number;
    year: number;
    exam_set_id: string;
    published_at: string;
    storage_object_path: string;
    storage_bucket: string | null;
    classes?: { class_name?: string | null } | null;
    exam_sets?: { name?: string | null } | null;
  }[]).map((r) => ({
    id: r.id,
    class_id: r.class_id,
    class_name: r.classes?.class_name ?? '—',
    term: r.term,
    year: r.year,
    exam_set_id: r.exam_set_id,
    exam_name: r.exam_sets?.name ?? '—',
    published_at: r.published_at,
    storage_object_path: r.storage_object_path,
    storage_bucket: r.storage_bucket || 'published-reports',
  }));
}

type RecordsTab = 'students' | 'class_zips';

export default function ReportRecordsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isTertiary } = useSchoolType();
  const [tab, setTab] = useState<RecordsTab>('students');
  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterExamId, setFilterExamId] = useState('');
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [q, setQ] = useState('');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);
  const [downloadQueue, setDownloadQueue] = useState<Set<string>>(new Set());
  const [failedDownloads, setFailedDownloads] = useState<StudentPdfRecord[]>([]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'student-pdf-records', user?.id ?? ''],
    queryFn: () => fetchStudentPdfRecords(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const { data: bundleRows = [], isLoading: bundlesLoading } = useQuery({
    queryKey: ['admin', 'report-records-bundles', user?.id ?? ''],
    queryFn: () => fetchClassReportBundles(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const studentYearOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      if (r.year) s.add(String(r.year));
    }
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const studentExamOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (r.exam_set_id && r.exam) m.set(r.exam_set_id, r.exam);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const bundleYearOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of bundleRows) s.add(String(r.year));
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [bundleRows]);

  const bundleExamOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of bundleRows) m.set(r.exam_set_id, r.exam_name);
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [bundleRows]);

  const filteredStudents = useMemo(() => {
    let out = rows;
    const t = q.trim().toLowerCase();
    if (t) {
      out = out.filter(
        (r) => 
          (r.student || '').toLowerCase().includes(t) ||
          (r.class || '').toLowerCase().includes(t) ||
          (r.exam || '').toLowerCase().includes(t)
      );
    }
    if (filterYear) {
      out = out.filter((r) => String(r.year) === filterYear);
    }
    if (filterTerm) {
      out = out.filter((r) => String(r.term) === filterTerm);
    }
    if (filterExamId) {
      out = out.filter((r) => r.exam_set_id === filterExamId);
    }
    const mul = sortNewestFirst ? -1 : 1;
    return [...out].sort(
      (a, b) => mul * (new Date(a.date).getTime() - new Date(b.date).getTime())
    );
  }, [rows, q, filterYear, filterTerm, filterExamId, sortNewestFirst]);

  const filteredBundles = useMemo(() => {
    let out = bundleRows;
    if (filterYear) out = out.filter((r) => String(r.year) === filterYear);
    if (filterTerm) out = out.filter((r) => String(r.term) === filterTerm);
    if (filterExamId) out = out.filter((r) => r.exam_set_id === filterExamId);
    const mul = sortNewestFirst ? -1 : 1;
    return [...out].sort(
      (a, b) => mul * (new Date(a.published_at).getTime() - new Date(b.published_at).getTime())
    );
  }, [bundleRows, filterYear, filterTerm, filterExamId, sortNewestFirst]);

  const downloadStudentPdf = async (row: StudentPdfRecord) => {
    // Prevent multiple concurrent downloads - limit to 5 at a time
    if (downloadQueue.size >= 5) {
      setDownloadErr('Too many downloads in progress. Please wait...');
      return;
    }

    if (downloadQueue.has(row.id)) {
      return;
    }

    setDownloadErr(null);
    setDownloadingKey(row.id);
    setDownloadQueue(prev => new Set([...prev, row.id]));
    
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to download PDF (attempt ${attempt}/${maxRetries}):`, {
          id: row.id,
          student: row.student,
          storage_bucket: row.storage_bucket,
          file: row.file,
        });

        // Generate proper filename
        const cleanStudentName = (row.student || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
        const cleanClassName = (row.class || 'Class').replace(/[^a-zA-Z0-9]/g, '_');
        const cleanExamName = (row.exam || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
        const termOrSem = isTertiary ? 'Semester' : 'Term';
        const filename = `${cleanStudentName}_${cleanClassName}_${termOrSem}_${row.term}_${cleanExamName}_${row.year}.pdf`;

        // Use mobileOptimizedDownload with retry logic
        await mobileOptimizedDownload(supabase, row.storage_bucket, row.file, filename);
        
        console.log('Download completed successfully for:', row.student);
        setFailedDownloads(prev => prev.filter(r => r.id !== row.id));
        break; // Success - exit retry loop
        
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error('Unknown download error');
        console.error(`Download attempt ${attempt} failed:`, lastError);

        // Check if error is retryable (5xx, network errors)
        const isRetryable = 
          lastError.message.includes('500') ||
          lastError.message.includes('502') ||
          lastError.message.includes('503') ||
          lastError.message.includes('504') ||
          lastError.message.includes('network') ||
          lastError.message.includes('timeout');

        if (attempt < maxRetries && isRetryable) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else if (attempt === maxRetries) {
          // All retries exhausted
          setFailedDownloads(prev => 
            prev.some(r => r.id === row.id) ? prev : [...prev, row]
          );
          setDownloadErr(
            `Failed to download PDF for ${row.student} after ${maxRetries} attempts. ` +
            `Error: ${lastError.message}`
          );
        }
      }
    }

    setDownloadingKey(null);
    setDownloadQueue(prev => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
  };

  const retryFailedDownloads = async () => {
    for (const row of failedDownloads) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Stagger retries
      await downloadStudentPdf(row);
    }
  };

  const downloadPublished = async (r: StudentPdfRecord) => {
    setDownloadErr(null);
    setDownloadingKey(r.id);
    try {
      const downloadName = buildSingleStudentReportPdfFilename({
        students: [
          {
            name: r.student,
            current_class: r.class ?? '',
          },
        ],
        examSet: {
          name: r.exam,
          term: r.term,
          year: r.year,
        },
      });
      await mobileOptimizedDownload(supabase, r.storage_bucket, r.file, downloadName);
    } catch (e: unknown) {
      setDownloadErr(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadingKey(null);
    }
  };

  const downloadBundle = async (r: ClassBundleRow) => {
    setDownloadErr(null);
    setDownloadingKey(`bundle-${r.id}`);
    try {
      const downloadName = buildPublishedClassBundleZipDownloadFilename({
        className: r.class_name,
        examName: r.exam_name,
        term: r.term,
        year: r.year,
      });
      await mobileOptimizedDownload(supabase, r.storage_bucket, r.storage_object_path, downloadName);
    } catch (e: unknown) {
      setDownloadErr(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadingKey(null);
    }
  };

  const yearOptions = tab === 'students' ? studentYearOptions : bundleYearOptions;
  const examOptions = tab === 'students' ? studentExamOptions : bundleExamOptions;
  const loading = tab === 'students' ? isLoading : bundlesLoading;

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            ARCHIVED RESULT SLIPS &amp; OFFICIAL TRANSCRIPTS
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            HISTORICAL CANDIDATE EXAMINATION SLIPS &amp; COHORT ARCHIVE BUNDLES
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports/generate-tertiary')}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RESULT SLIPS &amp; TRANSCRIPTS DESK</span>
          </button>
        </div>
      </div>

      {/* ── 2. CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs */}
          <div className="inline-flex border border-[#CCCCCC]">
            <button
              type="button"
              onClick={() => setTab('students')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                tab === 'students'
                  ? 'bg-[#111111] text-white font-bold'
                  : 'bg-white text-[#555555] hover:bg-[#F3F4F6]'
              }`}
            >
              CANDIDATE SLIPS ({filteredStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('class_zips')}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                tab === 'class_zips'
                  ? 'bg-[#111111] text-white font-bold'
                  : 'bg-white text-[#555555] hover:bg-[#F3F4F6]'
              }`}
            >
              COHORT ZIP BUNDLES ({filteredBundles.length})
            </button>
          </div>

          {tab === 'students' && (
            <div className="relative min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#888888]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter candidate, cohort, exam…"
                className="gov-input pl-8 text-xs font-mono w-full"
              />
            </div>
          )}

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="gov-select text-xs font-mono"
          >
            <option value="">ALL ACADEMIC YEARS</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {`${y}/${Number(y) + 1} ACADEMIC YEAR`}
              </option>
            ))}
          </select>

          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="gov-select text-xs font-mono"
          >
            <option value="">ALL SEMESTERS</option>
            <option value="1">SEMESTER 1</option>
            <option value="2">SEMESTER 2</option>
          </select>

          <select
            value={filterExamId}
            onChange={(e) => setFilterExamId(e.target.value)}
            className="gov-select text-xs font-mono"
          >
            <option value="">ALL EXAMS</option>
            {examOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={sortNewestFirst ? 'newest' : 'oldest'}
            onChange={(e) => setSortNewestFirst(e.target.value === 'newest')}
            className="gov-select text-xs font-mono"
          >
            <option value="newest">NEWEST FIRST</option>
            <option value="oldest">OLDEST FIRST</option>
          </select>
        </div>
      </div>

      {/* Errors & Retries */}
      {downloadErr && (
        <div className="border border-rose-300 bg-rose-50 p-3 text-xs font-mono text-rose-800 flex items-center justify-between">
          <span>{downloadErr}</span>
          <button
            type="button"
            onClick={() => setDownloadErr(null)}
            className="font-bold text-rose-900"
          >
            ×
          </button>
        </div>
      )}

      {failedDownloads.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 p-3 text-xs font-mono text-amber-800 flex items-center justify-between">
          <div>
            <span>{failedDownloads.length} ARCHIVED DOWNLOAD(S) FAILED.</span>
            <button
              type="button"
              onClick={retryFailedDownloads}
              disabled={downloadQueue.size >= 5}
              className="ml-3 underline font-bold"
            >
              RETRY FAILED
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFailedDownloads([])}
            className="font-bold text-amber-900"
          >
            CLEAR
          </button>
        </div>
      )}

      {/* ── 3. DATA TABLE ── */}
      <div className="gov-card overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'students' ? (
            <table className="gov-table w-full text-left">
              <thead>
                <tr>
                  <th>DATE RECORDED</th>
                  <th>CANDIDATE / TRAINEE</th>
                  <th>COURSE / COHORT</th>
                  <th>EXAMINATION SERIES</th>
                  <th>ACADEMIC CYCLE</th>
                  <th className="text-right">RESULT SLIP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <GovTableLoader colSpan={6} message="AUDITING HISTORICAL EXAMINATION ARCHIVES..." />
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs font-mono text-[#777777]">
                      NO ARCHIVED TRAINEE RESULT SLIPS FOUND
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="font-mono text-xs text-[#555555] whitespace-nowrap">
                        {new Date(r.date).toLocaleString('en-UG')}
                      </td>
                      <td className="font-bold text-xs text-[#111111]">
                        {r.student}
                      </td>
                      <td className="font-mono text-xs text-[#333333]">
                        {r.class}
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {r.exam}
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {`Semester ${r.term} · ${r.year}/${Number(r.year) + 1} Academic Year`}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={downloadingKey === r.id || downloadQueue.size >= 5}
                          onClick={() => downloadStudentPdf(r)}
                          className="gov-btn gov-btn-sm flex items-center gap-1.5 ml-auto"
                        >
                          {downloadingKey === r.id ? <GovRollingBox size="sm" /> : <Download className="w-3.5 h-3.5" />}
                          <span>{downloadingKey === r.id ? 'FETCHING...' : 'DOWNLOAD PDF'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="gov-table w-full text-left">
              <thead>
                <tr>
                  <th>PUBLISHED DATE</th>
                  <th>COHORT / CLASS</th>
                  <th>EXAMINATION SERIES</th>
                  <th>ACADEMIC CYCLE</th>
                  <th className="text-right">ZIP BUNDLE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <GovTableLoader colSpan={5} message="AUDITING COHORT BUNDLE ARCHIVES..." />
                ) : filteredBundles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs font-mono text-[#777777]">
                      NO COHORT ZIP BUNDLES FOUND
                    </td>
                  </tr>
                ) : (
                  filteredBundles.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="font-mono text-xs text-[#555555] whitespace-nowrap">
                        {new Date(r.published_at).toLocaleString('en-UG')}
                      </td>
                      <td className="font-bold text-xs text-[#111111]">
                        {r.class_name}
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {r.exam_name}
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {`Semester ${r.term} · ${r.year}/${Number(r.year) + 1} Academic Year`}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={downloadingKey === `bundle-${r.id}`}
                          onClick={() => downloadBundle(r)}
                          className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5 ml-auto"
                        >
                          {downloadingKey === `bundle-${r.id}` ? <GovRollingBox size="sm" /> : <Download className="w-3.5 h-3.5" />}
                          <span>{downloadingKey === `bundle-${r.id}` ? 'PACKING...' : 'DOWNLOAD BUNDLE'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
