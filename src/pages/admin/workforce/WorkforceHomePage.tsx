import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { supabase } from '@/lib/supabase';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import {
  CalendarDays,
  DollarSign,
  Kanban,
  ClipboardList,
  Award,
  Briefcase,
  Users,
  Clock,
  ArrowUpRight,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

export default function WorkforceHomePage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const canPay = usePermission(PERMISSION_KEYS.hrPayroll);

  // Fetch live workforce KPIs
  const { data: kpis } = useQuery({
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
      title: 'Leave Management',
      subtitle: 'Staff leave types, requests, approvals, and annual quotas.',
      to: '/dashboard/admin/workforce/leave',
      icon: CalendarDays,
      badge: kpis?.pendingLeave ? `${kpis.pendingLeave} pending` : 'All cleared',
      badgeColor: kpis?.pendingLeave ? 'amber' : 'mint',
      colorToken: t.mint,
      visible: canHr,
    },
    {
      title: 'Job Vacancies',
      subtitle: 'Publish academic & clinical vacancies with public candidate links.',
      to: '/dashboard/admin/jobs',
      icon: Briefcase,
      badge: kpis?.openJobs ? `${kpis.openJobs} active` : 'Manage posts',
      badgeColor: 'blue',
      colorToken: t.brand,
      visible: canHr,
    },
    {
      title: 'Recruitment & ATS',
      subtitle: 'Track incoming applicants across screening, interview, and offer.',
      to: '/dashboard/admin/workforce/recruitment',
      icon: Kanban,
      badge: kpis?.newApps ? `${kpis.newApps} new applicants` : 'Pipeline',
      badgeColor: kpis?.newApps ? 'gold' : 'blue',
      colorToken: t.gold,
      visible: canHr,
    },
    {
      title: 'Staff Onboarding',
      subtitle: 'Standardized onboarding task templates and active employee runs.',
      to: '/dashboard/admin/workforce/onboarding',
      icon: ClipboardList,
      badge: kpis?.activeRuns ? `${kpis.activeRuns} in progress` : 'Checklists',
      badgeColor: 'purple',
      colorToken: '#a78bfa',
      visible: canHr,
    },
    {
      title: 'Performance & Goals',
      subtitle: 'Appraisal cycles, employee KPI targets, and review evaluations.',
      to: '/dashboard/admin/workforce/performance',
      icon: Award,
      badge: kpis?.openCycles ? `${kpis.openCycles} open cycle` : 'Reviews',
      badgeColor: 'amber',
      colorToken: t.gold,
      visible: canHr,
    },
    {
      title: 'Staff Payroll',
      subtitle: 'Scheduled pay runs, gross-to-net calculations, and payslips.',
      to: '/dashboard/admin/workforce/payroll',
      icon: DollarSign,
      badge: kpis?.openPay ? `${kpis.openPay} pay run open` : 'Pay Runs',
      badgeColor: 'mint',
      colorToken: t.mint,
      visible: canPay,
    },
  ];

  return (
    <AdminPageWrapper
      eyebrow="Institution Workforce"
      title="Workforce & Human Resources"
      subtitle="Comprehensive staff administration: leave requests, hiring pipeline, onboarding checklists, performance appraisal, and payroll."
    >
      <div className="w-full space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          <div
            className="rounded-[18px] p-4 transition-all"
            style={{
              background: cardGrad(t),
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: t.textLow }}>
              <span>Total Staff</span>
              <Users className="h-4 w-4" style={{ color: t.mint }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              {kpis?.staffCount ?? '—'}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.mint }}>
              Active academic & support
            </div>
          </div>

          <div
            className="rounded-[18px] p-4 transition-all"
            style={{
              background: cardGrad(t),
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: t.textLow }}>
              <span>Pending Leave</span>
              <Clock className="h-4 w-4" style={{ color: t.gold }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: (kpis?.pendingLeave ?? 0) > 0 ? t.gold : t.textHi, fontFamily: SORA }}>
              {kpis?.pendingLeave ?? 0}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.textLow }}>
              Awaiting admin approval
            </div>
          </div>

          <div
            className="rounded-[18px] p-4 transition-all"
            style={{
              background: cardGrad(t),
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: t.textLow }}>
              <span>Applicant Pipeline</span>
              <Kanban className="h-4 w-4" style={{ color: t.brand }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              {kpis?.newApps ?? 0}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.textLow }}>
              New submissions to review
            </div>
          </div>

          <div
            className="rounded-[18px] p-4 transition-all"
            style={{
              background: cardGrad(t),
              border: `1px solid ${t.stroke}`,
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: t.textLow }}>
              <span>Active Pay Runs</span>
              <DollarSign className="h-4 w-4" style={{ color: t.mint }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: t.mint, fontFamily: SORA }}>
              {kpis?.openPay ?? 0}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.textLow }}>
              Open payroll periods
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.filter((c) => c.visible).map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className="group relative flex flex-col justify-between rounded-[20px] p-6 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: cardGrad(t),
                  border: `1px solid ${t.stroke}`,
                  boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.4)' : '0 4px 14px rgba(0,0,0,0.06)',
                }}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-[16px] transition-transform duration-200 group-hover:scale-105"
                      style={{
                        background: `${card.colorToken}15`,
                        border: `1px solid ${card.colorToken}35`,
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: card.colorToken }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          background: `${card.colorToken}15`,
                          color: card.colorToken,
                          border: `1px solid ${card.colorToken}30`,
                        }}
                      >
                        {card.badge}
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{ color: card.colorToken }}
                      />
                    </div>
                  </div>

                  <h3
                    className="mt-4 text-base font-bold transition-colors"
                    style={{ color: t.textHi, fontFamily: SORA }}
                  >
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed" style={{ color: t.textLow, fontFamily: INTER }}>
                    {card.subtitle}
                  </p>
                </div>

                <div
                  className="mt-5 flex items-center gap-1 text-xs font-semibold"
                  style={{ color: card.colorToken }}
                >
                  <span>Open module</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </div>
              </Link>
            );
          })}

          {!canHr && !canPay && (
            <div
              className="col-span-full flex items-center gap-3 rounded-[18px] p-5"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#fef3c7',
              }}
            >
              <ShieldAlert className="h-6 w-6 shrink-0 text-amber-400" />
              <div className="text-sm">
                You currently do not have workforce management permissions. An administrator can grant{' '}
                <strong>Workforce and HR</strong> or <strong>Payroll</strong> rights under Access & Permissions.
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
