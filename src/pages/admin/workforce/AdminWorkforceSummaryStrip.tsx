import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useWorkforceNavVisible } from '@/hooks/usePermission';

type Props = { schoolId: string };

/**
 * Compact workforce KPIs above the main admin design dashboard. Fails open (hidden) if HR tables are missing.
 */
export default function AdminWorkforceSummaryStrip({ schoolId }: Props) {
  const show = useWorkforceNavVisible();
  const [pendingLeave, setPendingLeave] = useState(0);
  const [newApps, setNewApps] = useState(0);
  const [payOpen, setPayOpen] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      try {
        const [l, a, p] = await Promise.all([
          supabase
            .from('hr_leave_requests')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('status', 'pending'),
          supabase
            .from('hr_job_applications')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('status', 'new'),
          supabase
            .from('hr_payroll_periods')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .in('status', ['draft', 'open']),
        ]);
        if (cancelled) return;
        if (l.error && a.error && p.error) {
          setFailed(true);
          return;
        }
        if (!l.error) setPendingLeave(l.count ?? 0);
        if (!a.error) setNewApps(a.count ?? 0);
        if (!p.error) setPayOpen(p.count ?? 0);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  if (!show) return null;
  if (failed) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--ac-border)] bg-white/[0.04] px-3 py-2 text-xs text-slate-200 sm:text-sm">
      <span className="font-medium text-emerald-300/90">Workforce</span>
      {pendingLeave !== null && (
        <Link
          to="/dashboard/admin/workforce/leave"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200 hover:border-sky-500/30"
        >
          Leave queue: {pendingLeave}
        </Link>
      )}
      {newApps !== null && (
        <Link
          to="/dashboard/admin/workforce/recruitment"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200 hover:border-sky-500/30"
        >
          New applications: {newApps}
        </Link>
      )}
      {payOpen !== null && payOpen > 0 && (
        <Link
          to="/dashboard/admin/workforce/payroll"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200 hover:border-sky-500/30"
        >
          Payroll periods (draft/open): {payOpen}
        </Link>
      )}
      <Link
        to="/dashboard/admin/workforce"
        className="ml-auto text-sky-400/90 hover:underline"
      >
        Open hub
      </Link>
    </div>
  );
}
