import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '../../../lib/supabase';
import {
  Stethoscope,
  FileText,
  Clock,
  Archive,
  FileSpreadsheet,
  ArrowLeft,
  ChevronRight,
  Printer,
  Award,
} from 'lucide-react';
import '@/styles/government-system.css';

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
      // Graceful fallback
    }

    const { data: pendingSnapshots } = await supabase
      .from('report_snapshots')
      .select('id')
      .eq('school_id', u.school_id)
      .in('status', ['draft', 'locked'])
      .limit(50);

    return {
      today: todayCount ?? 0,
      term: termCount ?? 0,
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
    queryFn: () => (user?.id ? fetchReportStats(user.id) : { today: 0, term: 0, pending: 0 }),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            INSTITUTIONAL RESULT SLIPS &amp; TRANSCRIPTS DESK
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            EXAMINATION DOCUMENT ISSUANCE, ACADEMIC TRANSCRIPTS &amp; OFFICIAL TRANSCRIPTS ARCHIVE
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin')}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>EXECUTIVE DASHBOARD</span>
          </button>
        </div>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ISSUED TODAY
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {stats.today.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            DOCUMENTS PRINTED &amp; EXPORTED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL ISSUED THIS CYCLE
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.term.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            OFFICIAL SLIPS GENERATED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            PENDING SNAPSHOTS
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {stats.pending.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            AWAITING FINAL COMPILATION
          </div>
        </div>
      </div>

      {/* ── 3. OPERATIONAL DESKS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module 1 */}
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/reports/generate')}
          className="gov-card p-5 text-left transition-all hover:border-[#111111] group bg-white border border-[#CCCCCC]"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 border border-[#CCCCCC] bg-[#F8F9FA] flex items-center justify-center text-[#111111]">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-[#888888] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#111111]">
              OPEN DESK <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-sm font-mono text-[#111111] uppercase tracking-tight">
              {isTertiary ? 'Generate Result Slips & Transcripts' : 'Generate Academic Reports'}
            </h3>
            <p className="text-xs text-[#555555] font-mono mt-1">
              {isTertiary
                ? 'Generate UNMEB semester result slips, official progress cards, and accredited academic transcripts.'
                : 'Batch print and export standardized academic report cards for all enrolled cohorts.'}
            </p>
          </div>
        </button>

        {/* Module 2 */}
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/report-records')}
          className="gov-card p-5 text-left transition-all hover:border-[#111111] group bg-white border border-[#CCCCCC]"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 border border-[#CCCCCC] bg-[#F8F9FA] flex items-center justify-center text-[#111111]">
              <Archive className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono text-[#888888] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#111111]">
              OPEN ARCHIVE <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-bold text-sm font-mono text-[#111111] uppercase tracking-tight">
              Historical Records &amp; Slips Archive
            </h3>
            <p className="text-xs text-[#555555] font-mono mt-1">
              Audit and retrieve verified historical result slip snapshots, permanent transcript records, and past exam boards.
            </p>
          </div>
        </button>

        {/* Module 3 */}
        {isTertiary && (
          <>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/tertiary')}
              className="gov-card p-5 text-left transition-all hover:border-[#111111] group bg-white border border-[#CCCCCC]"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 border border-[#CCCCCC] bg-[#F8F9FA] flex items-center justify-center text-[#111111]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-[#888888] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#111111]">
                  EXAMINATION DESK <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-sm font-mono text-[#111111] uppercase tracking-tight">
                  Cohort Broadsheets &amp; UNMEB Hub
                </h3>
                <p className="text-xs text-[#555555] font-mono mt-1">
                  Master mark sheets, official broadsheet export, national exam numbers (NSIN/UHPAB), and curriculum credit units.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/ward-postings')}
              className="gov-card p-5 text-left transition-all hover:border-[#111111] group bg-white border border-[#CCCCCC]"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 border border-[#CCCCCC] bg-[#F8F9FA] flex items-center justify-center text-[#111111]">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-[#888888] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#111111]">
                  CLINICAL DESK <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-sm font-mono text-[#111111] uppercase tracking-tight">
                  Hospital Ward Postings &amp; Clinical Rotations
                </h3>
                <p className="text-xs text-[#555555] font-mono mt-1">
                  Hospital rotation allocations, logbook sign-offs, clinical mentor assignments, and nursing council compliance.
                </p>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
