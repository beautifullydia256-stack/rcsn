import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { triggerBlobDownload, storageDownloadBlob } from '../../../lib/downloadBlob';

const STALE_TIME_MS = 5 * 60 * 1000;

export type ReportRecordRow = {
  rowKey: string;
  source: 'snapshot' | 'published';
  id: string;
  student_id: string;
  student_name: string;
  template_name: string;
  pdf_url: string | null;
  storage_object_path?: string;
  storage_bucket?: string;
  generated_at: string;
  /** Academic year / term / exam when row is from published_student_reports */
  reportYear?: number | null;
  reportTerm?: number | null;
  exam_set_id?: string | null;
  exam_name?: string | null;
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

export async function fetchReportRecords(userId: string): Promise<ReportRecordRow[]> {
  const { data: u, error: uErr } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (uErr || !u?.school_id) return [];

  const schoolId = u.school_id;

  const [snapRes, pubRes] = await Promise.all([
    supabase.from('report_snapshots').select('id').eq('school_id', schoolId),
    supabase
      .from('published_student_reports')
      .select(
        'id, student_id, term, year, exam_set_id, published_at, storage_object_path, storage_bucket, students(name), exam_sets(name), classes(class_name)'
      )
      .eq('school_id', schoolId)
      .order('published_at', { ascending: false }),
  ]);

  const out: ReportRecordRow[] = [];

  if (!snapRes.error && snapRes.data?.length) {
    const snapshotIds = snapRes.data.map((s: { id: string }) => s.id);
    const { data: genData } = await supabase
      .from('generated_reports')
      .select('id, student_id, template_id, pdf_url, generated_at, students(name), report_templates(name)')
      .in('snapshot_id', snapshotIds)
      .order('generated_at', { ascending: false });

    for (const r of genData || []) {
      const row = r as {
        id: string;
        student_id: string;
        pdf_url: string | null;
        generated_at: string;
        students?: { name?: string | null } | null;
        report_templates?: { name?: string | null } | null;
      };
      out.push({
        rowKey: `snapshot-${row.id}`,
        source: 'snapshot',
        id: row.id,
        student_id: row.student_id,
        student_name: row.students?.name ?? '—',
        template_name: row.report_templates?.name ?? '—',
        pdf_url: row.pdf_url,
        generated_at: row.generated_at,
      });
    }
  }

  if (!pubRes.error && pubRes.data?.length) {
    for (const r of pubRes.data as {
      id: string;
      student_id: string;
      term: number;
      year: number;
      exam_set_id: string;
      published_at: string;
      storage_object_path: string;
      storage_bucket: string | null;
      students?: { name?: string | null } | null;
      exam_sets?: { name?: string | null } | null;
      classes?: { class_name?: string | null } | null;
    }[]) {
      const exam = r.exam_sets?.name ?? '—';
      const cls = r.classes?.class_name ?? '—';
      out.push({
        rowKey: `published-${r.id}`,
        source: 'published',
        id: r.id,
        student_id: r.student_id,
        student_name: r.students?.name ?? '—',
        template_name: `Published · ${exam} · T${r.term} ${r.year} · ${cls}`,
        pdf_url: null,
        storage_object_path: r.storage_object_path,
        storage_bucket: r.storage_bucket || 'published-reports',
        generated_at: r.published_at,
        reportYear: r.year,
        reportTerm: r.term,
        exam_set_id: r.exam_set_id,
        exam_name: r.exam_sets?.name ?? null,
      });
    }
  }

  out.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  return out;
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

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'report-records', user?.id ?? ''],
    queryFn: () => fetchReportRecords(user!.id),
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
      const y = r.reportYear ?? new Date(r.generated_at).getFullYear();
      if (y) s.add(String(y));
    }
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const studentExamOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (r.exam_set_id && r.exam_name) m.set(r.exam_set_id, r.exam_name);
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
          (r.template_name || '').toLowerCase().includes(t) || (r.student_name || '').toLowerCase().includes(t)
      );
    }
    if (filterYear) {
      out = out.filter((r) => String(r.reportYear ?? new Date(r.generated_at).getFullYear()) === filterYear);
    }
    if (filterTerm) {
      out = out.filter((r) => r.reportTerm != null && String(r.reportTerm) === filterTerm);
    }
    if (filterExamId) {
      out = out.filter((r) => r.exam_set_id === filterExamId);
    }
    const mul = sortNewestFirst ? -1 : 1;
    return [...out].sort(
      (a, b) => mul * (new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime())
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

  const downloadPublished = async (r: ReportRecordRow) => {
    if (r.source !== 'published' || !r.storage_object_path) return;
    setDownloadErr(null);
    setDownloadingKey(r.rowKey);
    try {
      const bucket = r.storage_bucket || 'published-reports';
      const blob = await storageDownloadBlob(supabase, bucket, r.storage_object_path);
      const base = r.storage_object_path.split('/').pop() || 'report.pdf';
      triggerBlobDownload(blob, base);
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
      const blob = await storageDownloadBlob(supabase, r.storage_bucket, r.storage_object_path);
      const base = r.storage_object_path.split('/').pop() || 'class_bundle.zip';
      triggerBlobDownload(blob, base);
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
            placeholder="Filter by template or student name"
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
                  <th className="px-4 py-3 font-medium ac-text-muted">Date</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Student</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Template</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">File</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-[var(--ac-sidebar-active-bg)]/50">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="ac-text-muted px-4 py-8 text-center">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((r) => (
                    <tr key={r.rowKey} className="border-t border-[var(--ac-border)]">
                      <td className="ac-text-secondary px-4 py-2.5">
                        {new Date(r.generated_at).toLocaleString()}
                      </td>
                      <td className="ac-text-primary px-4 py-2.5 font-medium">{r.student_name}</td>
                      <td className="ac-text-secondary px-4 py-2.5">{r.template_name}</td>
                      <td className="px-4 py-2.5">
                        {r.source === 'snapshot' && r.pdf_url ? (
                          <a
                            href={r.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                          >
                            Open
                          </a>
                        ) : r.source === 'published' && r.storage_object_path ? (
                          <button
                            type="button"
                            disabled={downloadingKey === r.rowKey}
                            onClick={() => downloadPublished(r)}
                            className="inline-flex rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                          >
                            {downloadingKey === r.rowKey ? '…' : 'Download'}
                          </button>
                        ) : (
                          <span className="ac-text-muted">—</span>
                        )}
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
                  <th className="px-4 py-3 font-medium ac-text-muted">Date</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Class</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Exam</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">Term / Year</th>
                  <th className="px-4 py-3 font-medium ac-text-muted">ZIP</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-[var(--ac-sidebar-active-bg)]/50">
                {filteredBundles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ac-text-muted px-4 py-8 text-center">
                      No class ZIP bundles found
                    </td>
                  </tr>
                ) : (
                  filteredBundles.map((r) => (
                    <tr key={r.id} className="border-t border-[var(--ac-border)]">
                      <td className="ac-text-secondary px-4 py-2.5">
                        {new Date(r.published_at).toLocaleString()}
                      </td>
                      <td className="ac-text-primary px-4 py-2.5 font-medium">{r.class_name}</td>
                      <td className="ac-text-secondary px-4 py-2.5">{r.exam_name}</td>
                      <td className="ac-text-secondary px-4 py-2.5">
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
