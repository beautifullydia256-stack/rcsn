import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import GlassCard from '@/components/ui/GlassCard';
import { FileText, Activity, Database, HardDrive, Zap } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

type ReportRow = { report_id: string; template_name?: string; file_url?: string; created_at: string; students?: { name?: string; current_class?: string } };

async function fetchReports(userId: string): Promise<ReportRow[]> {
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
    queryFn: () => fetchReports(user!.id),
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
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: '#ae79ff' }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(174, 121, 255, 0.2)' }}>
                <FileText className="w-5 h-5" style={{ color: '#ae79ff' }} />
              </div>
              <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/reports')}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-white/85">Loading...</div>
            ) : reports.length === 0 ? (
              <div className="text-sm text-white/85">No recent reports</div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.report_id}
                  className="p-3 rounded-xl flex items-center justify-between"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                >
                  <div className="flex-1">
                    <div className="font-medium text-white text-sm">{report.template_name || 'Student Report'}</div>
                    <div className="text-xs text-white/70">
                      {report.students?.name || 'Student'} • {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (report.file_url) window.open(report.file_url, '_blank');
                      else navigate('/dashboard/admin/reports');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {report.file_url ? 'Open →' : 'View →'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: '#00d4ff' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(0, 212, 255, 0.2)' }}>
              <Activity className="w-5 h-5" style={{ color: '#00d4ff' }} />
            </div>
            <h2 className="text-lg font-semibold text-white">System Health</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" style={{ color: '#10b981' }} />
                <span className="text-sm text-white/85">Database</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-green-400 font-medium">{systemHealth.database.status}</span>
                <div className="text-xs text-white/70">{systemHealth.database.responseTime}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" style={{ color: '#4dabff' }} />
                <span className="text-sm text-white/85">Storage</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-white font-medium">{systemHealth.storage.used} / {systemHealth.storage.total}</span>
                <div className="text-xs text-white/70">{systemHealth.storage.percentage}% used</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />
                <span className="text-sm text-white/85">API</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-green-400 font-medium">{systemHealth.api.status}</span>
                <div className="text-xs text-white/70">{systemHealth.api.responseTime}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: '#ae79ff' }} />
                <span className="text-sm text-white/85">Background Jobs</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-green-400 font-medium">{systemHealth.jobs.status}</span>
                <div className="text-xs text-white/70">{systemHealth.jobs.active} active</div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
