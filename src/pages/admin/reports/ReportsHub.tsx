import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

export async function fetchReportStats(userId: string): Promise<{ today: number; term: number; pending: number }> {
  const zeros = { today: 0, term: 0, pending: 0 };
  const { data: u, error: uErr } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (uErr || !u?.school_id) return zeros;

  const { data: snapshotIds, error: snapErr } = await supabase
    .from('report_snapshots')
    .select('id')
    .eq('school_id', u.school_id);
  if (snapErr) return zeros;
  const ids = (snapshotIds || []).map((s: { id: string }) => s.id);
  if (ids.length === 0) return zeros;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const { count: today } = await supabase
    .from('generated_reports')
    .select('*', { count: 'exact', head: true })
    .in('snapshot_id', ids)
    .gte('generated_at', todayIso);

  const { count: term } = await supabase
    .from('generated_reports')
    .select('*', { count: 'exact', head: true })
    .in('snapshot_id', ids);

  const { data: pendingSnapshots, error: pendErr } = await supabase
    .from('report_snapshots')
    .select('id')
    .eq('school_id', u.school_id)
    .in('status', ['draft', 'locked']);

  if (pendErr) return { today: today ?? 0, term: term ?? 0, pending: 0 };

  return {
    today: today ?? 0,
    term: term ?? 0,
    pending: pendingSnapshots?.length ?? 0,
  };
}

export default function ReportsHub() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: stats = { today: 0, term: 0, pending: 0 } } = useQuery({
    queryKey: ['admin', 'report-stats', user?.id ?? ''],
    queryFn: () => fetchReportStats(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  return (
    <AdminPageWrapper
      eyebrow="Academic reports"
      title="Reports"
      subtitle="Generate and manage student academic reports"
    >
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="ac-glass-btn-secondary rounded-xl px-4 py-2 text-sm font-medium ac-text-primary"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          type="button"
          className="ac-glass-card p-6 text-left cursor-pointer border border-[var(--ac-border)] transition-all hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-400/25"
          onClick={() => navigate('/dashboard/admin/reports/generate')}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full ac-glass-icon ac-icon-blue flex items-center justify-center">
              <svg className="w-8 h-8 [color:var(--ac-accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="ac-text-primary text-lg font-medium mb-2">Generate reports</h3>
            <p className="ac-text-muted text-sm">
              Opens the primary or secondary generator from your school type (System Settings).
            </p>
          </div>
        </button>

        <button
          type="button"
          className="ac-glass-card p-6 text-left cursor-pointer border border-[var(--ac-border)] transition-all hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-400/25"
          onClick={() => navigate('/dashboard/admin/report-records')}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full ac-glass-icon ac-icon-green flex items-center justify-center">
              <svg className="w-8 h-8 [color:var(--ac-accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="ac-text-primary text-lg font-medium mb-2">Report Records</h3>
            <p className="ac-text-muted text-sm">View and manage historical report records</p>
          </div>
        </button>

        <button
          type="button"
          className="ac-glass-card p-6 text-left cursor-pointer border border-[var(--ac-border)] transition-all hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-400/25"
          onClick={() => navigate('/dashboard/admin/settings')}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full ac-glass-icon ac-icon-teal flex items-center justify-center">
              <svg className="w-8 h-8 [color:var(--ac-accent-teal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="ac-text-primary text-lg font-medium mb-2">Report Templates</h3>
            <p className="ac-text-muted text-sm">Configure report templates and settings</p>
          </div>
        </button>
      </div>

      <div className={`${adminCardClass} mt-6`}>
        <h3
          className="ac-text-primary mb-4 text-xl font-normal tracking-tight sm:text-2xl"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          Report Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div
              className="text-2xl font-normal text-emerald-600 dark:text-emerald-400"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              {stats.today}
            </div>
            <div className="ac-text-muted text-sm">Reports Generated Today</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-normal text-teal-600 dark:text-teal-400"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              {stats.term}
            </div>
            <div className="ac-text-muted text-sm">Total Reports This Term</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-normal text-slate-700 dark:text-slate-200"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              {stats.pending}
            </div>
            <div className="ac-text-muted text-sm">Pending Reports</div>
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
