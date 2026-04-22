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
      });
    }
  }

  out.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  return out;
}

export default function ReportRecordsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [year, setYear] = useState('');
  const [q, setQ] = useState('');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'report-records', user?.id ?? ''],
    queryFn: () => fetchReportRecords(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const filtered = useMemo(() => {
    let out = rows;
    const t = q.trim().toLowerCase();
    if (t) {
      out = out.filter(
        (r) =>
          (r.template_name || '').toLowerCase().includes(t) || (r.student_name || '').toLowerCase().includes(t)
      );
    }
    if (year) {
      out = out.filter((r) => String(new Date(r.generated_at).getFullYear()) === year);
    }
    return out;
  }, [rows, q, year]);

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

  return (
    <AdminPageWrapper
      eyebrow="History"
      title="Report Records"
      subtitle="View and manage historical report records"
    >
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/reports')}
          className="ac-glass-btn-secondary min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Reports
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by template or student name"
          className="ac-input rounded-xl px-3 py-2.5"
        />
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year (e.g. 2026)"
          className="ac-input rounded-xl px-3 py-2.5"
        />
      </div>

      {downloadErr && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {downloadErr}
        </div>
      )}

      <div className={`${adminCardClass} overflow-x-auto p-0 sm:p-0`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--ac-border)] border-t-emerald-500" />
          </div>
        ) : (
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="ac-text-muted px-4 py-8 text-center">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
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
        )}
      </div>
    </AdminPageWrapper>
  );
}
