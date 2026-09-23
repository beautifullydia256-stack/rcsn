import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { fetchAccountantDashboardMetrics } from '@/lib/accountantDashboardMetrics';
import { resolveActiveStudentIdsForTerm } from '@/lib/adminFinanceTerm';
import { Users, GraduationCap, CalendarCheck, FileCheck, Wallet, CreditCard, FileText, TrendingUp } from 'lucide-react';
import { useAcademicVocabulary } from '@/hooks/useAcademicVocabulary';

const STALE_TIME_MS = 5 * 60 * 1000;

export const ADMIN_KPIS_QUERY_KEY = ['dashboard', 'admin', 'kpis'] as const;

type Kpis = {
  students: number;
  teachers: number;
  /** e.g. "294 / 1,042" present vs active enrolled */
  attendance: string;
  attendanceSub: string;
  activeClasses: number;
  /** Same basis as accountant “Current term performance” (see fetchAccountantDashboardMetrics). */
  finance: {
    feesExpected: number;
    feesCollectedAttributed: number;
    outstandingOnTerm: number;
    collectionRatePercent: number | null;
    currentTermLabel: string | null;
  };
};

export async function fetchAdminKpis(schoolId: string): Promise<Kpis> {
  const today = schoolCalendarTodayIso();

  const [metrics, teachersResult, attendanceResult, activeClassesResult] = await Promise.all([
    fetchAccountantDashboardMetrics(supabase, schoolId, today),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase
      .from('student_attendance')
      .select('student_id, present, status')
      .eq('school_id', schoolId)
      .eq('attendance_date', today),
    supabase
      .from('students')
      .select('current_class')
      .eq('school_id', schoolId)
      .eq('status', 'active'),
  ]);

  const tp = metrics.termPerformance;
  const activeClasses = new Set((activeClassesResult.data || []).map((s: { current_class?: string | null }) => s.current_class).filter(Boolean)).size;

  // Use the term already resolved inside fetchAccountantDashboardMetrics — avoids a duplicate RPC call
  const currentTerm = metrics.currentTerm;
  const activeStudentIdSet = currentTerm
    ? await resolveActiveStudentIdsForTerm(supabase, schoolId, currentTerm, today)
    : null;
  const enrolled = activeStudentIdSet ? activeStudentIdSet.size : 0;
  const rawAttRows = (attendanceResult.data || []) as {
    student_id: string;
    present?: boolean | null;
    status?: string | null;
  }[];
  // Attendance is strictly scoped to students active in the current term/semester
  const attRows = activeStudentIdSet
    ? rawAttRows.filter((x) => activeStudentIdSet.has(x.student_id))
    : rawAttRows;
  const presentToday = new Set(
    attRows.filter((x) => studentAttendanceRowIsPresent(x)).map((x) => x.student_id)
  ).size;
  const markedToday = new Set(attRows.map((x) => x.student_id)).size;
  const absentToday = Math.max(0, markedToday - presentToday);

  const studentRows = (activeClassesResult.data || []) as { current_class?: string | null }[];
  const totalActiveStudents = studentRows.length;
  const totalStudents = currentTerm ? enrolled : totalActiveStudents;
  const attendanceDenominator = totalStudents > 0 ? totalStudents : markedToday;
  const pctOfRoster = attendanceDenominator > 0 ? Math.round((presentToday / attendanceDenominator) * 100) : 0;
  const attendanceSub =
    markedToday > 0
      ? `${pctOfRoster}% attendance rate · ${absentToday.toLocaleString()} absent of ${markedToday.toLocaleString()} recorded`
      : 'Active enrollments';

  return {
    students: totalStudents,
    teachers: teachersResult.count ?? 0,
    attendance: `${presentToday.toLocaleString()} / ${totalStudents.toLocaleString()}`,
    attendanceSub,
    activeClasses,
    finance: {
      feesExpected: tp.feesExpected,
      feesCollectedAttributed: tp.feesCollectedAttributed,
      outstandingOnTerm: tp.outstandingOnTerm,
      collectionRatePercent: tp.collectionRatePercent,
      currentTermLabel: metrics.currentTerm?.label ?? null,
    },
  };
}

type KPIVariant = 'blue' | 'green' | 'orange' | 'teal';

function AdminKPICard({
  icon: Icon,
  label,
  value,
  subline,
  variant = 'green',
  href,
  isLoading,
  isPlaceholder,
  valueScale = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subline?: string;
  variant?: KPIVariant;
  href?: string;
  isLoading?: boolean;
  isPlaceholder?: boolean;
  /** Use for UGX-style figures so 10+ digit amounts stay readable. */
  valueScale?: 'default' | 'largeNumber';
}) {
  const navigate = useNavigate();
  const stripeGradient: Record<KPIVariant, string> = {
    teal: 'linear-gradient(90deg, #10d9a8, #22d3ee)',
    green: 'linear-gradient(90deg, #10d9a8, #22d3ee)',
    blue: 'linear-gradient(90deg, #3d8ef8, #9d7bf8)',
    orange: 'linear-gradient(90deg, #f5a623, #ef4444)',
  };

  const iconColor: Record<KPIVariant, string> = {
    teal: '#10d9a8',
    green: '#10d9a8',
    blue: '#3d8ef8',
    orange: '#f5a623',
  };

  const iconBg: Record<KPIVariant, string> = {
    teal: 'rgba(16,217,168,0.15)',
    green: 'rgba(16,217,168,0.15)',
    blue: 'rgba(61,142,248,0.15)',
    orange: 'rgba(245,166,35,0.15)',
  };

  const card = (
    <div
      className={`bg-[#0b1120] rounded-[13px] border border-white/10 p-5 transition-all hover:border-white/20 ${
        isPlaceholder ? 'opacity-60' : ''
      }`}
    >
      <div className="h-[2px] rounded-full" style={{ background: stripeGradient[variant] }} />

      <div className="mt-3 flex items-start justify-between gap-3">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg[variant], color: iconColor[variant] }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider" style={{ color: '#8296be' }}>
        {label}
      </p>

      {valueScale === 'largeNumber' ? (
        <div className="mt-2 min-w-0 w-full max-w-full overflow-x-auto [scrollbar-width:thin]">
          <p
            className="inline-block whitespace-nowrap text-xl font-extrabold tabular-nums tracking-tight leading-snug sm:text-2xl"
            style={{ color: '#eef3ff' }}
          >
            {isLoading && !isPlaceholder ? (
              <span className="inline-block h-8 w-28 animate-pulse rounded bg-white/15" />
            ) : (
              value
            )}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: '#eef3ff', lineHeight: 1 }}>
          {isLoading && !isPlaceholder ? (
            <span className="inline-block h-8 w-20 animate-pulse rounded bg-white/15" />
          ) : (
            value
          )}
        </p>
      )}

      {subline && (
        <p className="mt-2 text-sm font-medium" style={{ color: '#3d5278' }}>
          {subline}
        </p>
      )}
    </div>
  );

  if (href && !isPlaceholder) {
    return (
      <button type="button" onClick={() => navigate(href)} className="w-full text-left">
        {card}
      </button>
    );
  }
  return card;
}

interface AdminKPICardsProps {
  schoolId: string;
  /** Inside design HTML shell — tighter spacing, no duplicate “Key figures” page title. */
  embedded?: boolean;
}

export default function AdminKPICards({ schoolId, embedded = false }: AdminKPICardsProps) {
  const { isTertiary, v } = useAcademicVocabulary();
  const { data: kpis, isLoading } = useQuery({
    queryKey: [...ADMIN_KPIS_QUERY_KEY, schoolId],
    queryFn: () => fetchAdminKpis(schoolId),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  /** Same number formatting as accountant FinancialOverview (large figures, tabular alignment). */
  const fmt = (n: number) =>
    n == null || Number.isNaN(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const peopleCards = kpis
    ? [
        {
          label: isTertiary ? 'Total trainees' : 'Total students',
          value: kpis.students,
          subline: 'Active enrollments',
          variant: 'teal' as KPIVariant,
          href: '/dashboard/admin/students',
          icon: Users,
          valueScale: 'default' as const,
        },
        {
          label: isTertiary ? 'Total tutors' : 'Total teachers',
          value: kpis.teachers,
          subline: isTertiary ? 'Academic & clinical staff' : 'Teaching staff on record',
          variant: 'blue' as KPIVariant,
          href: '/dashboard/admin/teachers',
          icon: GraduationCap,
          valueScale: 'default' as const,
        },
        {
          label: 'Attendance today',
          value: kpis.attendance,
          subline: kpis.attendanceSub,
          variant: 'teal' as KPIVariant,
          href: undefined,
          icon: CalendarCheck,
          valueScale: 'default' as const,
        },
        {
          label: isTertiary ? 'Active courses & stages' : 'Active classes',
          value: kpis.activeClasses,
          subline: isTertiary ? 'Across all cohorts' : 'Across all streams',
          variant: 'teal' as KPIVariant,
          href: undefined,
          icon: FileCheck,
          valueScale: 'default' as const,
        },
      ]
    : [];

  const collectionRateDisplay =
    kpis && kpis.finance.collectionRatePercent != null ? `${kpis.finance.collectionRatePercent}%` : '—';

  const financeCards = kpis
    ? [
        {
          label: 'Fees invoiced (expected)',
          value: fmt(kpis.finance.feesExpected),
          subline: kpis.finance.currentTermLabel
            ? `${v.financeCurrentPeriod}: ${isTertiary ? kpis.finance.currentTermLabel.replace(/Term/gi, 'Semester') : kpis.finance.currentTermLabel}`
            : `${v.financeCurrentPeriod} (engine calendar)`,
          variant: 'blue' as KPIVariant,
          href: '/dashboard/admin/outstanding',
          icon: Wallet,
          valueScale: 'largeNumber' as const,
        },
        {
          label: v.financeCurrentPeriodAttributed,
          value: fmt(kpis.finance.feesCollectedAttributed),
          subline: 'Same basis as accountant dashboard',
          variant: 'teal' as KPIVariant,
          href: '/dashboard/admin/outstanding',
          icon: CreditCard,
          valueScale: 'largeNumber' as const,
        },
        {
          label: `Outstanding (${v.financeCurrentPeriod.toLowerCase()} only)`,
          value: fmt(kpis.finance.outstandingOnTerm),
          subline: `Balances on ${v.financeCurrentPeriod.toLowerCase()} ledger`,
          variant: 'orange' as KPIVariant,
          href: '/dashboard/admin/outstanding',
          icon: FileText,
          valueScale: 'largeNumber' as const,
        },
        {
          label: 'Collection rate',
          value: collectionRateDisplay,
          subline: 'Percentage of term fees paid',
          variant: 'teal' as KPIVariant,
          href: '/dashboard/admin/outstanding',
          icon: TrendingUp,
          valueScale: 'largeNumber' as const,
        },
      ]
    : [];

  return (
    <section className={embedded ? 'mb-4' : 'mb-7'}>
      {!embedded && (
        <h2 className="ac-text-muted mb-4 text-sm font-semibold uppercase tracking-wider">Key figures</h2>
      )}

      <div className={embedded ? 'mb-4' : 'mb-6'}>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7fa8' }}>
          People & operations
        </h3>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {peopleCards.map((c) => (
            <AdminKPICard
              key={c.label}
              icon={c.icon}
              label={c.label}
              value={c.value}
              subline={c.subline}
              variant={c.variant}
              href={c.href}
              isLoading={isLoading}
              valueScale={c.valueScale}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7fa8' }}>
          Financial overview
        </h3>
        <p className="mb-3 text-[11px] font-medium" style={{ color: '#4a5f8a' }}>
          Current term performance — same definitions as the accountant dashboard
        </p>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {financeCards.map((c) => (
            <AdminKPICard
              key={c.label}
              icon={c.icon}
              label={c.label}
              value={c.value}
              subline={c.subline}
              variant={c.variant}
              href={c.href}
              isLoading={isLoading}
              valueScale={c.valueScale}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
