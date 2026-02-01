import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';

/** Same card style as old 2f00b44 reports page */
const reportCardClass =
  'rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchReportStats(userId: string): Promise<{ today: number; term: number; pending: number }> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return { today: 0, term: 0, pending: 0 };

  const { data: snapshotIds } = await supabase
    .from('report_snapshots')
    .select('id')
    .eq('school_id', u.school_id);
  const ids = (snapshotIds || []).map((s: { id: string }) => s.id);
  if (ids.length === 0) return { today: 0, term: 0, pending: 0 };

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

  const { data: pendingSnapshots } = await supabase
    .from('report_snapshots')
    .select('id')
    .eq('school_id', u.school_id)
    .in('status', ['draft', 'locked']);

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
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header – same as old 2f00b44 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-semibold">Reports Management</h1>
            <p className="text-white/80 text-sm mt-1">Generate and manage student academic reports</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Report Options – same grid and card style as old 2f00b44 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            type="button"
            className={`${reportCardClass} p-6 text-left cursor-pointer hover:bg-white/15 transition-colors`}
            onClick={() => navigate('/dashboard/admin/reports/generate')}
          >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-medium mb-2">Generate Reports</h3>
            <p className="text-white/70 text-sm">Create student academic reports for exams and terms</p>
          </div>
        </button>

        <button
          type="button"
          className={`${reportCardClass} p-6 text-left cursor-pointer hover:bg-white/15 transition-colors`}
          onClick={() => navigate('/dashboard/admin/report-records')}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-medium mb-2">Report Records</h3>
            <p className="text-white/70 text-sm">View and manage historical report records</p>
          </div>
        </button>

        <button
          type="button"
          className={`${reportCardClass} p-6 text-left cursor-pointer hover:bg-white/15 transition-colors`}
          onClick={() => navigate('/dashboard/admin/settings')}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-medium mb-2">Report Templates</h3>
            <p className="text-white/70 text-sm">Configure report templates and settings</p>
          </div>
        </button>
      </div>

        {/* Report Statistics – same as old 2f00b44 */}
        <div className={`${reportCardClass} mt-8 p-6`}>
          <h3 className="text-white text-lg font-medium mb-4">Report Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.today}</div>
              <div className="text-white/70 text-sm">Reports Generated Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.term}</div>
              <div className="text-white/70 text-sm">Total Reports This Term</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.pending}</div>
              <div className="text-white/70 text-sm">Pending Reports</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
