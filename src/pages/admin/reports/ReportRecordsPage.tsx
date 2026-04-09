import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

export async function fetchReportRecords(userId: string): Promise<any[]> {
  const { data: u, error: uErr } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (uErr || !u?.school_id) return [];

  const { data: snapshots, error: snapErr } = await supabase
    .from('report_snapshots')
    .select('id')
    .eq('school_id', u.school_id);
  if (snapErr) return [];
  const snapshotIds = (snapshots || []).map((s: { id: string }) => s.id);
  if (snapshotIds.length === 0) return [];

  const { data } = await supabase
    .from('generated_reports')
    .select('id, student_id, template_id, pdf_url, generated_at, students(name), report_templates(name)')
    .in('snapshot_id', snapshotIds)
    .order('generated_at', { ascending: false });

  return (data || []).map((r: any) => ({
    id: r.id,
    student_id: r.student_id,
    student_name: r.students?.name ?? '—',
    template_name: r.report_templates?.name ?? '—',
    pdf_url: r.pdf_url,
    generated_at: r.generated_at,
  }));
}

export default function ReportRecordsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [year, setYear] = useState('');
  const [q, setQ] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'report-records', user?.id ?? ''],
    queryFn: () => fetchReportRecords(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const filtered = useMemo(() => {
    let out = rows;
    const t = q.trim().toLowerCase();
    if (t) out = out.filter((r: any) => (r.template_name || '').toLowerCase().includes(t) || (r.student_name || '').toLowerCase().includes(t));
    if (year) out = out.filter((r: any) => String(new Date(r.generated_at).getFullYear()) === year);
    return out;
  }, [rows, q, year]);

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
                  filtered.map((r: any) => (
                    <tr key={r.id} className="border-t border-[var(--ac-border)]">
                      <td className="ac-text-secondary px-4 py-2.5">
                        {new Date(r.generated_at).toLocaleString()}
                      </td>
                      <td className="ac-text-primary px-4 py-2.5 font-medium">{r.student_name}</td>
                      <td className="ac-text-secondary px-4 py-2.5">{r.template_name}</td>
                      <td className="px-4 py-2.5">
                        {r.pdf_url ? (
                          <a
                            href={r.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                          >
                            Open
                          </a>
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
