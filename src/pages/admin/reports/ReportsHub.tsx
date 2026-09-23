import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '../../../lib/supabase';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { Stethoscope, FileText, Clock, Archive, FileSpreadsheet } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

export async function fetchReportStats(userId: string): Promise<{ today: number; term: number; pending: number }> {
  const zeros = { today: 0, term: 0, pending: 0 };
  const { data: u, error: uErr } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (uErr || !u?.school_id) return zeros;

  try {
    const { data: snapshotIds, error: snapErr } = await supabase
      .from('report_snapshots')
      .select('id')
      .eq('school_id', u.school_id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (snapErr) return zeros;
    const ids = (snapshotIds || []).map((s: { id: string }) => s.id);
    if (ids.length === 0) return zeros;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    let todayCount = 0;
    let termCount = 0;
    try {
      const [{ count: t }, { count: r }] = await Promise.all([
        supabase.from('generated_reports').select('*', { count: 'exact', head: true }).in('snapshot_id', ids).gte('generated_at', todayIso),
        supabase.from('generated_reports').select('*', { count: 'exact', head: true }).in('snapshot_id', ids),
      ]);
      todayCount = t ?? 0;
      termCount = r ?? 0;
    } catch {
      // Graceful fallback if exact count times out
    }
    const today = todayCount;
    const term = termCount;

    const { data: pendingSnapshots } = await supabase
      .from('report_snapshots')
      .select('id')
      .eq('school_id', u.school_id)
      .in('status', ['draft', 'locked'])
      .limit(50);

    return {
      today: today ?? 0,
      term: term ?? 0,
      pending: pendingSnapshots?.length ?? 0,
    };
  } catch {
    return zeros;
  }
}

export default function ReportsHub() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { isTertiary } = useSchoolType();

  const { data: stats = { today: 0, term: 0, pending: 0 } } = useQuery({
    queryKey: ['admin', 'report-stats', user?.id ?? ''],
    queryFn: () => fetchReportStats(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  return (
    <AdminPageWrapper
      eyebrow={isTertiary ? 'Academic Records' : 'Academic reports'}
      title={isTertiary ? 'Result Slips & Transcripts' : 'Reports'}
      subtitle={
        isTertiary
          ? 'Generate and manage UNMEB result slips, semester records, and transcripts'
          : 'Generate and manage student academic reports'
      }
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
              <FileText className="w-8 h-8 [color:var(--ac-accent-blue)]" />
            </div>
            <h3 className="ac-text-primary text-lg font-medium mb-2">
              {isTertiary ? 'Generate Result Slips & Transcripts' : 'Generate reports'}
            </h3>
            <p className="ac-text-muted text-sm">
              {isTertiary
                ? 'Generate UNMEB semester result slips and academic transcripts for trainees.'
                : 'Opens the primary or secondary generator from your school type (System Settings).'}
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
              <Archive className="w-8 h-8 [color:var(--ac-accent-green)]" />
            </div>
            <h3 className="ac-text-primary text-lg font-medium mb-2">
              {isTertiary ? 'Historical Records & Slips' : 'Report Records'}
            </h3>
            <p className="ac-text-muted text-sm">
              {isTertiary
                ? 'View and manage historical result slip records and archives'
                : 'View and manage historical report records'}
            </p>
          </div>
        </button>

        {isTertiary ? (
          <>
            <button
              type="button"
              className="ac-glass-card p-6 text-left cursor-pointer border border-[var(--ac-border)] transition-all hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-400/25"
              onClick={() => navigate('/dashboard/admin/tertiary')}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full ac-glass-icon ac-icon-teal flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 [color:var(--ac-accent-teal)]" />
                </div>
                <h3 className="ac-text-primary text-lg font-medium mb-2">Cohort Broadsheets & UNMEB Hub</h3>
                <p className="ac-text-muted text-sm">Master mark sheets, broadsheet exports, and UNMEB national exam records</p>
              </div>
            </button>

            <button
              type="button"
              className="ac-glass-card p-6 text-left cursor-pointer border border-[var(--ac-border)] transition-all hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-400/25"
              onClick={() => navigate('/dashboard/admin/ward-postings')}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full ac-glass-icon ac-icon-teal flex items-center justify-center">
                  <Stethoscope className="w-8 h-8 [color:var(--ac-accent-teal)]" />
                </div>
                <h3 className="ac-text-primary text-lg font-medium mb-2">Ward Postings & Clinical</h3>
                <p className="ac-text-muted text-sm">Review hospital rotations and council logbook verification</p>
              </div>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="hidden ac-glass-card p-6 text-left cursor-pointer border border-[var(--ac-border)] transition-all hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-400/25"
            onClick={() => navigate('/dashboard/admin/settings')}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full ac-glass-icon ac-icon-teal flex items-center justify-center">
                <Clock className="w-8 h-8 [color:var(--ac-accent-teal)]" />
              </div>
              <h3 className="ac-text-primary text-lg font-medium mb-2">Report Templates</h3>
              <p className="ac-text-muted text-sm">Configure report templates and settings</p>
            </div>
          </button>
        )}
      </div>

      <div className={`${adminCardClass} mt-6`}>
        <h3
          className="ac-text-primary mb-4 text-xl font-normal tracking-tight sm:text-2xl"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          {isTertiary ? 'Document Statistics' : 'Report Statistics'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div
              className="text-2xl font-normal text-emerald-600 dark:text-emerald-400"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              {stats.today}
            </div>
            <div className="ac-text-muted text-sm">
              {isTertiary ? 'Slips Generated Today' : 'Reports Generated Today'}
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-normal text-teal-600 dark:text-teal-400"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              {stats.term}
            </div>
            <div className="ac-text-muted text-sm">
              {isTertiary ? 'Total Slips This Semester' : 'Total Reports This Term'}
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-normal text-slate-700 dark:text-slate-200"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              {stats.pending}
            </div>
            <div className="ac-text-muted text-sm">
              {isTertiary ? 'Pending Documents' : 'Pending Reports'}
            </div>
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
