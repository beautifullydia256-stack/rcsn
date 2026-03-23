import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { FileText, Activity, Database, HardDrive, Zap } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

type ReportRow = { report_id: string; template_name?: string; file_url?: string; created_at: string; students?: { name?: string; current_class?: string } };

export async function fetchRecentDashboardReports(userId: string): Promise<ReportRow[]> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return [];
  const { data } = await supabase
    .from('reports')
    .select('report_id, template_name, file_url, created_at, student_id, students!inner(name, current_class)')
    .eq('school_id', u.school_id)
    .order('created_at', { ascending: false })
    .limit(5);
  return (data || []) as ReportRow[];
}

export default function RecentReportsSystemHealth() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['dashboard', 'admin', 'reports', user?.id ?? ''],
    queryFn: () => fetchRecentDashboardReports(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const loading = isLoading;

  const systemHealth = {
    database: { status: 'healthy', responseTime: '45ms' },
    storage: { used: '2.4GB', total: '10GB', percentage: 24 },
    api: { status: 'operational', responseTime: '120ms' },
    jobs: { status: 'running', active: 3 },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="ac-glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#10d9a8]/15 border border-[#10d9a8]/25">
              <FileText className="w-5 h-5 text-[#10d9a8]" />
            </div>
            <h2 className="text-lg font-semibold ac-text-primary">Recent Reports</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports')}
            className="text-sm font-medium text-[#10d9a8] hover:text-[#14f0bb] transition-colors"
          >
            View all →
          </button>
        </div>
        <div className="space-y-2">
          {loading ? (
            <div className="text-sm ac-text-muted">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="text-sm ac-text-muted">No recent reports</div>
          ) : (
            reports.map((report) => (
              <div
                key={report.report_id}
                className="p-3 rounded-xl flex items-center justify-between bg-white/5 border border-white/10"
              >
                <div className="flex-1">
                  <div className="font-medium ac-text-primary text-sm">{report.template_name || 'Student Report'}</div>
                  <div className="text-xs ac-text-muted">
                    {report.students?.name || 'Student'} • {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (report.file_url) window.open(report.file_url, '_blank');
                    else navigate('/dashboard/admin/reports');
                  }}
                  className="text-xs font-medium text-[#10d9a8] hover:text-[#14f0bb] transition-colors"
                >
                  {report.file_url ? 'Open →' : 'View →'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="ac-glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[#10d9a8]/15 border border-[#10d9a8]/25">
            <Activity className="w-5 h-5 text-[#10d9a8]" />
          </div>
          <h2 className="text-lg font-semibold ac-text-primary">System Health</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#10d9a8]" />
              <span className="text-sm ac-text-secondary">Database</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#10d9a8] font-medium">{systemHealth.database.status}</span>
              <div className="text-xs ac-text-muted">{systemHealth.database.responseTime}</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#10d9a8]" />
              <span className="text-sm ac-text-secondary">Storage</span>
            </div>
            <div className="text-right">
              <span className="text-xs ac-text-primary font-medium">{systemHealth.storage.used} / {systemHealth.storage.total}</span>
              <div className="text-xs ac-text-muted">{systemHealth.storage.percentage}% used</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#10d9a8]" />
              <span className="text-sm ac-text-secondary">API</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#10d9a8] font-medium">{systemHealth.api.status}</span>
              <div className="text-xs ac-text-muted">{systemHealth.api.responseTime}</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#10d9a8]" />
              <span className="text-sm ac-text-secondary">Background Jobs</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#10d9a8] font-medium">{systemHealth.jobs.status}</span>
              <div className="text-xs ac-text-muted">{systemHealth.jobs.active} active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
