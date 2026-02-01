import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchReportRecords(userId: string): Promise<any[]> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return [];

  const { data: snapshots } = await supabase
    .from('report_snapshots')
    .select('id')
    .eq('school_id', u.school_id);
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
    <AdminPageWrapper title="Report Records" subtitle="View and manage historical report records">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/dashboard/admin/reports')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Reports
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by template or student name"
          className="rounded-lg border border-white/20 bg-white/10 text-white px-3 py-2 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year (e.g. 2025)"
          className="rounded-lg border border-white/20 bg-white/10 text-white px-3 py-2 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className={`${adminCardClass} overflow-x-auto`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white" />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left">
                <th className="px-4 py-2 text-white/80">Date</th>
                <th className="px-4 py-2 text-white/80">Student</th>
                <th className="px-4 py-2 text-white/80">Template</th>
                <th className="px-4 py-2 text-white/80">File</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/70">
                    No reports found
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="px-4 py-2 text-white/90">
                      {new Date(r.generated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-white">{r.student_name}</td>
                    <td className="px-4 py-2 text-white/90">{r.template_name}</td>
                    <td className="px-4 py-2">
                      {r.pdf_url ? (
                        <a
                          href={r.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-white/50">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminPageWrapper>
  );
}
