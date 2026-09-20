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
        const filename = `${cleanStudentName}_${cleanClassName}_Term_${row.term}_${cleanExamName}_${row.year}.pdf`;

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
    <AdminPageWrapper
      eyebrow="History"
      title="Report Records"
      subtitle="View and manage historical report records"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/reports')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Reports
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-[var(--ac-border)] bg-[var(--ac-card-bg)] p-1">
        <button
          type="button"
          onClick={() => setTab('students')}
          className={`min-h-[40px] flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
            tab === 'students'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'ac-text-muted hover:ac-text-primary'
          }`}
        >
          Student PDFs
        </button>
        <button
          type="button"
          onClick={() => setTab('class_zips')}
          className={`min-h-[40px] flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
            tab === 'class_zips'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'ac-text-muted hover:ac-text-primary'
          }`}
        >
          Class ZIP bundles
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
        {tab === 'students' ? (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by student, class, or exam"
            className="ac-input rounded-xl px-3 py-2.5 lg:col-span-2"
          />
        ) : (
          <div className="ac-text-muted text-sm lg:col-span-2 flex items-center px-1">
            Complete class ZIP files for download
          </div>
        )}
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="ac-input rounded-xl px-3 py-2.5"
          aria-label="Filter by year"
        >
          <option value="">All years</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={filterTerm}
          onChange={(e) => setFilterTerm(e.target.value)}
          className="ac-input rounded-xl px-3 py-2.5"
          aria-label="Filter by term"
        >
          <option value="">All terms</option>
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
        <select
          value={filterExamId}
          onChange={(e) => setFilterExamId(e.target.value)}
          className="ac-input rounded-xl px-3 py-2.5"
          aria-label="Filter by exam"
        >
          <option value="">All exams</option>
          {examOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={sortNewestFirst ? 'newest' : 'oldest'}
          onChange={(e) => setSortNewestFirst(e.target.value === 'newest')}
          className="ac-input rounded-xl px-3 py-2.5"
          aria-label="Sort by date"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {downloadErr && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {downloadErr}
          <button
            type="button"
            onClick={() => setDownloadErr(null)}
            className="ml-2 text-red-300 hover:text-red-100"
          >
            ×
          </button>
        </div>
      )}

      {failedDownloads.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-amber-200">
              {failedDownloads.length} download(s) failed. 
              <button
                type="button"
                onClick={retryFailedDownloads}
                disabled={downloadQueue.size >= 5}
                className="ml-2 font-semibold text-amber-100 hover:text-amber-50 disabled:opacity-50"
              >
                Retry Failed
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFailedDownloads([])}
              className="text-amber-300 hover:text-amber-100"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className={`${adminCardClass} overflow-x-auto p-0 sm:p-0`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--ac-border)] border-t-emerald-500" />
          </div>
        ) : tab === 'students' ? (
          <div className="ac-table-wrap overflow-hidden rounded-xl border border-[var(--ac-border)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-card-bg)] text-left">
                  <th className="px-4 py-3 font-medium ac-text-muted hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Student</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Class</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Exam</th>
                  <th className="px-4 py-3 font-medium ac-text-muted hidden md:table-cell">Term / Year</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">File</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-[var(--ac-sidebar-active-bg)]/50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ac-text-muted px-4 py-8 text-center hidden sm:table-cell">
                      No reports found
                    </td>
                    <td colSpan={5} className="ac-text-muted px-4 py-8 text-center sm:hidden md:table-cell">
                      No reports found
                    </td>
                    <td colSpan={5} className="ac-text-muted px-4 py-8 text-center sm:table-cell md:hidden">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--ac-border)]">
                      <td className="ac-text-secondary px-4 py-2.5 hidden sm:table-cell">
                        {new Date(r.date).toLocaleString()}
                      </td>
                      <td className="ac-text-primary px-4 py-2.5 font-medium">{r.student}</td>
                      <td className="ac-text-secondary px-4 py-2.5">{r.class}</td>
                      <td className="ac-text-secondary px-4 py-2.5">{r.exam}</td>
                      <td className="ac-text-secondary px-4 py-2.5 hidden md:table-cell">
                        Term {r.term} · {r.year}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          disabled={downloadingKey === r.id || downloadQueue.size >= 5}
                          onClick={() => downloadStudentPdf(r)}
                          className="inline-flex rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                          title={downloadQueue.size >= 5 ? `Queue full (${downloadQueue.size}/5)` : ''}
                        >
                          {downloadingKey === r.id ? '…' : 'Download'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ac-table-wrap overflow-hidden rounded-xl border border-[var(--ac-border)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-card-bg)] text-left">
                  <th className="px-4 py-3 font-medium ac-text-muted hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Class</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Exam</th>
                  <th className="px-4 py-3 font-medium ac-text-muted hidden md:table-cell">Term / Year</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">ZIP</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-[var(--ac-sidebar-active-bg)]/50">
                {filteredBundles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ac-text-muted px-4 py-8 text-center hidden sm:table-cell">
                      No class ZIP bundles found
                    </td>
                    <td colSpan={3} className="ac-text-muted px-4 py-8 text-center sm:hidden md:table-cell">
                      No class ZIP bundles found
                    </td>
                    <td colSpan={4} className="ac-text-muted px-4 py-8 text-center sm:table-cell md:hidden">
                      No class ZIP bundles found
                    </td>
                  </tr>
                ) : (
                  filteredBundles.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--ac-border)]">
                      <td className="ac-text-secondary px-4 py-2.5 hidden sm:table-cell">
                        {new Date(r.published_at).toLocaleString()}
                      </td>
                      <td className="ac-text-primary px-4 py-2.5 font-medium">{r.class_name}</td>
                      <td className="ac-text-secondary px-4 py-2.5">{r.exam_name}</td>
                      <td className="ac-text-secondary px-4 py-2.5 hidden md:table-cell">
                        Term {r.term} · {r.year}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          disabled={downloadingKey === `bundle-${r.id}`}
                          onClick={() => downloadBundle(r)}
                          className="inline-flex rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                        >
                          {downloadingKey === `bundle-${r.id}` ? '…' : 'Download'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
