'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/src/lib/supabase';
import { FileText, Activity, Database, HardDrive, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RecentReportsSystemHealth() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const currentTerm = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { today };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: u } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
        if (!u?.school_id) return;

        const { data: allTerms } = await supabase
          .from('school_terms')
          .select('start_date, end_date')
          .eq('school_id', u.school_id)
          .order('year', { ascending: false })
          .order('term', { ascending: false });
        
        const currentTermData = (allTerms || []).find((t: any) => 
          t.start_date ? 
            (t.start_date <= currentTerm.today && t.end_date >= currentTerm.today) : 
            (t.end_date >= currentTerm.today)
        ) || (allTerms && allTerms[0]) || null;

        const { data: reportsData } = await supabase
          .from("reports")
          .select("report_id, template_name, file_url, created_at, student_id, students!inner(name, current_class)")
          .eq("school_id", u.school_id)
          .order("created_at", { ascending: false })
          .limit(5);

        setReports(reportsData || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentTerm.today]);

  // Mock system health data
  const systemHealth = {
    database: { status: 'healthy', responseTime: '45ms' },
    storage: { used: '2.4GB', total: '10GB', percentage: 24 },
    api: { status: 'operational', responseTime: '120ms' },
    jobs: { status: 'running', active: 3 }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Recent Reports */}
      <div className="bg-[#101828] rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#10d9a8]/15">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/admin/reports')}
            className="text-sm font-semibold text-[#10d9a8] hover:text-[#14f0bb] transition-colors"
          >
            View all →
          </button>
        </div>
        <div className="space-y-2">
          {loading ? (
            <div className="text-sm text-white/60">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="text-sm text-white/60">No recent reports</div>
          ) : (
            reports.map((report) => (
              <div
                key={report.report_id}
                className="p-3 rounded-xl flex items-center justify-between bg-white/5 border border-white/10"
              >
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">
                    {report.template_name || 'Student Report'}
                  </div>
                  <div className="text-xs text-white/60">
                    {report.students?.name || 'Student'} • {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (report.file_url) {
                      window.open(report.file_url, '_blank');
                    } else {
                      router.push('/dashboard/admin/report-records');
                    }
                  }}
                  className="text-xs font-semibold text-[#10d9a8] hover:text-[#14f0bb] transition-colors"
                >
                  {report.file_url ? 'Open →' : 'View →'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* System Health */}
      <div className="bg-[#101828] rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[#10d9a8]/15">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-white">System Health</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-600" />
              <span className="text-sm text-white/80">Database</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-green-600 font-medium">{systemHealth.database.status}</span>
              <div className="text-xs text-white/60">{systemHealth.database.responseTime}</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-green-600" />
              <span className="text-sm text-white/80">Storage</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-white font-medium">
                {systemHealth.storage.used} / {systemHealth.storage.total}
              </span>
              <div className="text-xs text-white/60">{systemHealth.storage.percentage}% used</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-sm text-white/80">API</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-green-600 font-medium">{systemHealth.api.status}</span>
              <div className="text-xs text-white/60">{systemHealth.api.responseTime}</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-sm text-white/80">Background Jobs</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-green-600 font-medium">{systemHealth.jobs.status}</span>
              <div className="text-xs text-white/60">{systemHealth.jobs.active} active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

