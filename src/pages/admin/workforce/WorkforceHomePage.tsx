import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
  CalendarDays,
  DollarSign,
  Kanban,
  ClipboardList,
  Award,
  Briefcase,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

export default function WorkforceHomePage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);

  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const canPay = usePermission(PERMISSION_KEYS.hrPayroll);

  // Fetch live workforce KPIs
  const { data: kpis, isLoading, refetch } = useQuery({
    queryKey: ['workforce-home-kpis', schoolId],
    queryFn: async () => {
      if (!schoolId) {
        return { staffCount: 0, pendingLeave: 0, openJobs: 0, newApps: 0, activeRuns: 0, openCycles: 0, openPay: 0 };
      }
      const [tRes, oRes, lRes, jRes, aRes, rRes, cRes, pRes] = await Promise.all([
        supabase.from('teachers').select('teacher_id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('other_staff_members').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('hr_leave_requests').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'pending'),
        supabase.from('jobs').select('job_id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'Open'),
        supabase.from('hr_job_applications').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'new'),
        supabase.from('hr_onboarding_runs').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'in_progress'),
        supabase.from('hr_review_cycles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
        supabase.from('hr_payroll_periods').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).in('status', ['draft', 'open']),
      ]);

      return {
        staffCount: (tRes.count ?? 0) + (oRes.count ?? 0),
        pendingLeave: lRes.count ?? 0,
        openJobs: jRes.count ?? 0,
        newApps: aRes.count ?? 0,
        activeRuns: rRes.count ?? 0,
        openCycles: cRes.count ?? 0,
        openPay: pRes.count ?? 0,
      };
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });

  const cards = [
    {
      title: 'LEAVE MANAGEMENT & PERMITS',
      code: 'DESK-HR-01',
      subtitle: 'Faculty and support staff leave requests, statutory quotas, and official clearance workflow.',
      to: '/dashboard/admin/workforce/leave',
      icon: CalendarDays,
      metricLabel: 'CLEARANCE QUEUE',
      metricVal: kpis?.pendingLeave ? `${kpis.pendingLeave} PENDING` : 'ALL CLEARED',
      isWarning: Boolean(kpis?.pendingLeave && kpis.pendingLeave > 0),
      visible: canHr,
    },
    {
      title: 'CAREERS & VACANCIES REGISTRY',
      code: 'DESK-HR-02',
      subtitle: 'Publish academic & clinical vacancies, manage public job listings, and track submissions.',
      to: '/dashboard/admin/jobs',
      icon: Briefcase,
      metricLabel: 'ACTIVE POSTINGS',
      metricVal: kpis?.openJobs ? `${kpis.openJobs} OPEN ROLES` : '0 OPEN',
      isWarning: false,
      visible: canHr,
    },
    {
      title: 'RECRUITMENT & APPLICANT ATS',
      code: 'DESK-HR-03',
      subtitle: 'Screen incoming candidate submissions, manage interview rounds, and issue appointment offers.',
      to: '/dashboard/admin/workforce/recruitment',
      icon: Kanban,
      metricLabel: 'INCOMING DOSSIERS',
      metricVal: kpis?.newApps ? `${kpis.newApps} NEW APPLICANTS` : 'PIPELINE STABLE',
      isWarning: Boolean(kpis?.newApps && kpis.newApps > 0),
      visible: canHr,
    },
    {
      title: 'EMPLOYEE ONBOARDING PROTOCOL',
      code: 'DESK-HR-04',
      subtitle: 'Standardized institutional checklists, document compliance, and active employee orientation.',
      to: '/dashboard/admin/workforce/onboarding',
      icon: ClipboardList,
      metricLabel: 'ORIENTATION RUNS',
      metricVal: kpis?.activeRuns ? `${kpis.activeRuns} IN PROGRESS` : 'NO ACTIVE RUNS',
      isWarning: false,
      visible: canHr,
    },
    {
      title: 'PERFORMANCE & FACULTY APPRAISAL',
      code: 'DESK-HR-05',
      subtitle: 'Institutional appraisal cycles, employee KPI objectives, and clinical supervision evaluations.',
      to: '/dashboard/admin/workforce/performance',
      icon: Award,
      metricLabel: 'APPRAISAL CYCLE',
      metricVal: kpis?.openCycles ? `${kpis.openCycles} ACTIVE CYCLE` : 'CONCLUDED',
      isWarning: false,
      visible: canHr,
    },
    {
      title: 'INSTITUTIONAL PAYROLL DISBURSEMENT',
      code: 'DESK-HR-06',
      subtitle: 'Scheduled monthly salary runs, gross-to-net statutory deductions, and official payslips.',
      to: '/dashboard/admin/workforce/payroll',
      icon: DollarSign,
      metricLabel: 'PAY DISBURSEMENT',
      metricVal: kpis?.openPay ? `${kpis.openPay} CYCLE OPEN` : 'CURRENT PERIOD CONCLUDED',
      isWarning: Boolean(kpis?.openPay && kpis.openPay > 0),
      visible: canPay,
    },
  ];

  if (isLoading && !kpis) {
    return (
      <div className="admin-terminal-page space-y-5 p-4">
        <GovPageLoader message="LOADING WORKFORCE & HUMAN RESOURCES REGISTRY..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-5 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            INSTITUTIONAL WORKFORCE &amp; HUMAN RESOURCES HUB
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            OFFICIAL FACULTY, CLINICAL INSTRUCTORS &amp; SUPPORT STAFF REGISTRY • REPUBLIC OF UGANDA
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH METRICS</span>
        </button>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY STRIP (6 BOXES) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL STAFF
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {kpis?.staffCount ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ACTIVE FACULTY
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            PENDING LEAVE
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${
            (kpis?.pendingLeave ?? 0) > 0 ? 'text-amber-700' : 'text-[#111111]'
          }`}>
            {kpis?.pendingLeave ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            AWAITING ACTION
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            OPEN VACANCIES
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {kpis?.openJobs ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            CAREER POSTINGS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            APPLICANTS
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${
            (kpis?.newApps ?? 0) > 0 ? 'text-blue-700' : 'text-[#111111]'
          }`}>
            {kpis?.newApps ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            NEW DOSSIERS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ONBOARDING
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {kpis?.activeRuns ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            IN ORIENTATION
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            PAY RUNS
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${
            (kpis?.openPay ?? 0) > 0 ? 'text-emerald-700' : 'text-[#111111]'
          }`}>
            {kpis?.openPay ?? 0}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            CYCLES OPEN
          </div>
        </div>
      </div>

      {/* ── 3. OPERATIONAL WORKFORCE DESKS GRID ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.filter((c) => c.visible).map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="gov-card p-4 flex flex-col justify-between hover:bg-[#F9F9FB] transition-colors border border-[#CCCCCC] group"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <span className="text-[10px] font-mono font-bold text-[#777777] uppercase tracking-wider">
                    {card.code}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
                    card.isWarning
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-[#F1F3F5] text-[#111111] border-[#CCCCCC]'
                  }`}>
                    {card.metricVal}
                  </span>
                </div>

                <div className="flex items-start gap-3 mt-3">
                  <div className="w-9 h-9 border border-[#111111] bg-white flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#111111]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold font-mono uppercase text-[#111111] group-hover:underline">
                      {card.title}
                    </h2>
                    <p className="text-[11px] font-mono text-[#555555] mt-1 leading-relaxed">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#777777] uppercase tracking-wider">
                  {card.metricLabel}
                </span>
                <span className="text-xs font-mono font-bold text-[#111111] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>ENTER DESK</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
