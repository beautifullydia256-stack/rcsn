import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Users, GraduationCap, DollarSign, CalendarCheck, Clock, FileCheck } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

export const ADMIN_KPIS_QUERY_KEY = ['dashboard', 'admin', 'kpis'] as const;

type Kpis = {
  students: number;
  teachers: number;
  outstanding: number;
  feesCollected: number;
  attendance: number;
  pendingExpenses: number;
  activeClasses: number;
  jobApplications: number | null; // placeholder for now (requires backend data mapping)
};

export async function fetchAdminKpis(schoolId: string): Promise<Kpis> {
  const today = new Date().toISOString().slice(0, 10);

  const [
    termsResult,
    studentsResult,
    teachersResult,
    attendanceResult,
    pendingExpensesResult,
    activeClassesResult,
  ] = await Promise.all([
    supabase
      .from('school_terms')
      .select('id, start_date, end_date, year, term')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: false }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('student_attendance').select('student_id').eq('school_id', schoolId).eq('date', today).eq('present', true),
    supabase
      .from('school_expenses')
      .select('expense_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'pending'),
    supabase
      .from('students')
      .select('current_class')
      .eq('school_id', schoolId)
      .eq('status', 'active'),
  ]);

  const allTerms = termsResult.data || [];
  const currentTermData =
    allTerms.find(
      (t: { start_date?: string; end_date: string }) =>
        t.start_date ? t.start_date <= today && t.end_date >= today : t.end_date >= today
    ) || (allTerms[0] as { id?: string; start_date?: string; end_date: string }) || null;

  const termId = currentTermData?.id ?? null;

  const [feesCollectedResult, termBalancesResult] = await Promise.all([
    termId
      ? supabase
          .from('student_payments')
          .select('amount_paid')
          .eq('school_id', schoolId)
          .eq('term_id', termId)
          .is('reversed_at', null)
      : Promise.resolve({ data: [] as { amount_paid: number }[] }),
    termId
      ? supabase
          .from('student_balances')
          .select('balance')
          .eq('school_id', schoolId)
          .eq('term_id', termId)
      : Promise.resolve({ data: [] as { balance: number }[] }),
  ]);

  const outstanding = (termBalancesResult.data || []).reduce(
    (sum: number, r: { balance?: number }) => sum + Math.max(0, Number(r.balance ?? 0)),
    0
  );

  const feesCollected = (feesCollectedResult.data || []).reduce(
    (sum: number, p: { amount_paid?: number }) => sum + Number(p.amount_paid || 0),
    0
  );

  const pendingExpenses = pendingExpensesResult.count ?? 0;
  const activeClasses = new Set((activeClassesResult.data || []).map((s: { current_class?: string | null }) => s.current_class).filter(Boolean)).size;

  // Placeholder: "job applications" isn't available in existing KPIs fetch.
  const jobApplications = null;

  return {
    students: studentsResult.count ?? 0,
    teachers: teachersResult.count ?? 0,
    outstanding,
    feesCollected,
    attendance: new Set((attendanceResult.data || []).map((x: { student_id: string }) => x.student_id)).size,
    pendingExpenses,
    activeClasses,
    jobApplications,
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subline?: string;
  variant?: KPIVariant;
  href?: string;
  isLoading?: boolean;
  isPlaceholder?: boolean;
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

      <p className="mt-2 text-3xl font-extrabold" style={{ color: '#eef3ff', lineHeight: 1 }}>
        {isLoading && !isPlaceholder ? (
          <span className="inline-block h-8 w-20 animate-pulse rounded bg-white/15" />
        ) : (
          value
        )}
      </p>

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
}

export default function AdminKPICards({ schoolId }: AdminKPICardsProps) {
  const { data: kpis, isLoading } = useQuery({
    queryKey: [...ADMIN_KPIS_QUERY_KEY, schoolId],
    queryFn: () => fetchAdminKpis(schoolId),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);

  const cards = kpis
    ? [
        {
          label: 'Total Students',
          value: kpis.students,
          subline: 'Active enrollments',
          variant: 'teal' as KPIVariant,
          href: '/dashboard/admin/students',
          icon: Users,
        },
        {
          label: 'Total Teachers',
          value: kpis.teachers,
          subline: '3 on leave today (placeholder)',
          variant: 'blue' as KPIVariant,
          href: '/dashboard/admin/teachers',
          icon: GraduationCap,
        },
        {
          label: 'Fees Collected',
          value: fmt(kpis.feesCollected),
          subline: 'This term',
          variant: 'teal' as KPIVariant,
          href: '/dashboard/admin/outstanding',
          icon: DollarSign,
        },
        {
          label: 'Outstanding Fees',
          value: fmt(kpis.outstanding),
          subline: 'Balance due',
          variant: 'orange' as KPIVariant,
          href: '/dashboard/admin/outstanding',
          icon: DollarSign,
        },
        {
          label: 'Attendance Today',
          value: kpis.attendance,
          subline: 'Present',
          variant: 'teal' as KPIVariant,
          href: undefined,
          icon: CalendarCheck,
        },
        {
          label: 'Pending Expenses',
          value: kpis.pendingExpenses,
          subline: 'Awaiting approval',
          variant: 'orange' as KPIVariant,
          href: undefined,
          icon: Clock,
        },
        {
          label: 'Active Classes',
          value: kpis.activeClasses,
          subline: 'Across all streams',
          variant: 'teal' as KPIVariant,
          href: undefined,
          icon: FileCheck,
        },
        {
          label: 'Job Applications',
          value: '—',
          subline: 'Placeholder',
          variant: 'blue' as KPIVariant,
          href: undefined,
          icon: GraduationCap,
          isPlaceholder: true,
        },
      ]
    : [];

  return (
    <section className="mb-7">
      <h2 className="ac-text-muted mb-4 text-sm font-semibold uppercase tracking-wider">Key figures</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <AdminKPICard
            key={c.label}
            icon={c.icon}
            label={c.label}
            value={c.value}
            subline={c.subline}
            variant={c.variant}
            href={c.href}
            isLoading={isLoading}
            isPlaceholder={c.isPlaceholder}
          />
        ))}
      </div>
    </section>
  );
}
