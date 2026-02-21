import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Users, GraduationCap, DollarSign, CalendarCheck } from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

type Kpis = {
  students: number;
  teachers: number;
  outstanding: number;
  feesCollected: number;
  attendance: number;
};

async function fetchAdminKpis(schoolId: string): Promise<Kpis> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: allTerms } = await supabase
    .from('school_terms')
    .select('id, start_date, end_date, year, term')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: false });

  const currentTermData =
    (allTerms || []).find(
      (t: { start_date?: string; end_date: string }) =>
        t.start_date ? t.start_date <= today && t.end_date >= today : t.end_date >= today
    ) || (allTerms?.[0] as { start_date?: string; end_date: string }) || null;

  const [
    studentsResult,
    teachersResult,
    attendanceResult,
    balancesResult,
    feesCollectedResult,
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase.from('student_attendance').select('student_id').eq('school_id', schoolId).eq('date', today).eq('present', true),
    supabase.from('students').select('student_id, expected_fee_amount').eq('school_id', schoolId).eq('status', 'active'),
    currentTermData
      ? supabase
          .from('student_payments')
          .select('amount_paid')
          .eq('school_id', schoolId)
          .gte('payment_date', currentTermData.start_date || '1900-01-01')
          .lte('payment_date', currentTermData.end_date || '2100-12-31')
      : supabase.from('student_payments').select('amount_paid').eq('school_id', schoolId),
  ]);

  const studentIds = (balancesResult.data || []).map((s: { student_id: string }) => s.student_id);
  const { data: payments } = await supabase
    .from('student_payments')
    .select('student_id, amount_paid')
    .in('student_id', studentIds)
    .eq('school_id', schoolId);

  const paidByStudent: Record<string, number> = {};
  (payments || []).forEach((p: { student_id: string; amount_paid: number }) => {
    if (studentIds.includes(p.student_id)) {
      paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount_paid || 0);
    }
  });

  const outstanding = (balancesResult.data || [])
    .map(
      (s: { student_id: string; expected_fee_amount?: number }) =>
        Math.max(0, Number(s.expected_fee_amount || 0) - (paidByStudent[s.student_id] || 0))
    )
    .reduce((sum: number, b: number) => sum + b, 0);

  const feesCollected = (feesCollectedResult.data || []).reduce(
    (sum: number, p: { amount_paid?: number }) => sum + Number(p.amount_paid || 0),
    0
  );

  return {
    students: studentsResult.count ?? 0,
    teachers: teachersResult.count ?? 0,
    outstanding,
    feesCollected,
    attendance: new Set((attendanceResult.data || []).map((x: { student_id: string }) => x.student_id)).size,
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
  const borderTopClass: Record<KPIVariant, string> = {
    blue: 'border-t-[3px] border-t-blue-400/90',
    green: 'border-t-[3px] border-t-emerald-500/90',
    orange: 'border-t-[3px] border-t-amber-500/90',
    teal: 'border-t-[3px] border-t-teal-500/90',
  };
  const iconClass: Record<KPIVariant, string> = {
    blue: 'ac-glass-icon ac-icon-blue',
    green: 'ac-glass-icon ac-icon-green',
    orange: 'ac-glass-icon ac-icon-orange',
    teal: 'ac-glass-icon ac-icon-teal',
  };

  const card = (
    <div
      className={`ac-glass-card will-change-transform rounded-[18px] p-5 transition-shadow hover:shadow-[var(--ac-shadow-strong)] ${borderTopClass[variant]} ${isPlaceholder ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={iconClass[variant]}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="ac-text-primary mt-3 text-2xl font-semibold tracking-tight">
        {isLoading && !isPlaceholder ? (
          <span className="inline-block h-8 w-20 animate-pulse rounded ac-skeleton-block" />
        ) : (
          value
        )}
      </p>
      <p className="ac-text-secondary mt-0.5 text-sm font-medium">{label}</p>
      {subline && <p className="ac-text-muted mt-1 text-xs">{subline}</p>}
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
    queryKey: ['dashboard', 'admin', 'kpis', schoolId],
    queryFn: () => fetchAdminKpis(schoolId),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);

  const cards = kpis
    ? [
        {
          label: 'TOTAL STUDENTS',
          value: kpis.students,
          subline: 'Active',
          variant: 'green' as KPIVariant,
          href: '/dashboard/admin/students',
          icon: Users,
        },
        {
          label: 'TOTAL TEACHERS',
          value: kpis.teachers,
          subline: 'Staff',
          variant: 'blue' as KPIVariant,
          href: '/dashboard/admin/teachers',
          icon: GraduationCap,
        },
        {
          label: 'FEES COLLECTED',
          value: fmt(kpis.feesCollected),
          subline: 'This term',
          variant: 'green' as KPIVariant,
          href: '/dashboard/admin/outstanding',
          icon: DollarSign,
        },
        {
          label: 'OUTSTANDING BALANCES',
          value: fmt(kpis.outstanding),
          subline: 'Balance due',
          variant: 'orange' as KPIVariant,
          href: '/dashboard/admin/outstanding',
          icon: DollarSign,
        },
        {
          label: 'ATTENDANCE TODAY',
          value: kpis.attendance,
          subline: 'Present',
          variant: 'teal' as KPIVariant,
          href: undefined,
          icon: CalendarCheck,
        },
        {
          label: 'PLACEHOLDER 1',
          value: '---',
          subline: '',
          variant: 'teal' as KPIVariant,
          href: undefined,
          icon: Users,
          isPlaceholder: true,
        },
        {
          label: 'PLACEHOLDER 2',
          value: '---',
          subline: '',
          variant: 'teal' as KPIVariant,
          href: undefined,
          icon: Users,
          isPlaceholder: true,
        },
        {
          label: 'PLACEHOLDER 3',
          value: '---',
          subline: '',
          variant: 'teal' as KPIVariant,
          href: undefined,
          icon: Users,
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
